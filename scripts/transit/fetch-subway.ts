// 수도권 전철 노선·역 데이터를 OpenStreetMap(Overpass API)에서 받아 data/transit/seoul-subway.json으로 저장한다.
// 데이터: © OpenStreetMap contributors, ODbL 1.0. 앱은 저장된 파일만 읽고 실행 중에 OSM을 부르지 않는다.
// 실행: npx tsx scripts/transit/fetch-subway.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "MajungiClassProject/1.0 (student demo app)";
// 서울과 인천·김포공항까지 (남, 서, 북, 동)
const BBOX = [37.4, 126.4, 37.72, 127.18] as const;

// 앱에서 보여 줄 노선: OSM ref → 화면 표기. 급행·특급 운행 계통은 정차역이 일부라서 뺀다.
const LINES: { ref: string; id: string; ko: string; en: string; short: string }[] = [
  { ref: "1", id: "L1", ko: "1호선", en: "Line 1", short: "1" },
  { ref: "2", id: "L2", ko: "2호선", en: "Line 2", short: "2" },
  { ref: "3", id: "L3", ko: "3호선", en: "Line 3", short: "3" },
  { ref: "4", id: "L4", ko: "4호선", en: "Line 4", short: "4" },
  { ref: "5", id: "L5", ko: "5호선", en: "Line 5", short: "5" },
  { ref: "6", id: "L6", ko: "6호선", en: "Line 6", short: "6" },
  { ref: "7", id: "L7", ko: "7호선", en: "Line 7", short: "7" },
  { ref: "8", id: "L8", ko: "8호선", en: "Line 8", short: "8" },
  { ref: "9", id: "L9", ko: "9호선", en: "Line 9", short: "9" },
  { ref: "공항철도", id: "AREX", ko: "공항철도", en: "AREX", short: "A" },
  { ref: "경의·중앙", id: "GJ", ko: "경의·중앙선", en: "Gyeongui–Jungang", short: "GJ" },
  { ref: "수인·분당", id: "SB", ko: "수인·분당선", en: "Suin–Bundang", short: "SB" },
  { ref: "신분당", id: "SBD", ko: "신분당선", en: "Shinbundang", short: "S" },
  { ref: "경춘", id: "GC", ko: "경춘선", en: "Gyeongchun", short: "GC" },
  { ref: "W", id: "UI", ko: "우이신설선", en: "Ui–Sinseol", short: "UI" },
  { ref: "Silim", id: "SL", ko: "신림선", en: "Sillim", short: "SL" },
  { ref: "김포 골드라인", id: "GG", ko: "김포골드라인", en: "Gimpo Goldline", short: "G" },
  { ref: "서해", id: "SH", ko: "서해선", en: "Seohae", short: "SH" },
];
const EXPRESS = /급행|특급|Rapid|Express/i;

type OsmMember = { type: string; ref: number; role: string };
type OsmElement = { type: "node" | "relation"; id: number; lat?: number; lon?: number; tags?: Record<string, string>; members?: OsmMember[] };

async function overpass(query: string): Promise<OsmElement[]> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return ((await res.json()) as { elements: OsmElement[] }).elements;
}

const inBox = (lat: number, lon: number) => lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3];
// "서울역", "서울 (1호선)" 같은 표기 차이를 지우고 역 이름만 남긴다
const baseKo = (name: string) => name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\d+호선$/, "").replace(/역$/, "").trim();
const baseEn = (name: string) => name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+Station$/i, "").replace(/\s+Line\s*\d+$/i, "").trim();
const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 88.2);

async function main() {
  const bbox = BBOX.join(",");
  const elements = await overpass(
    `[out:json][timeout:220];rel["route"~"^(subway|train|light_rail)$"](${bbox})->.r;.r out body;node(r.r);out body;`,
  );
  const nodes = new Map(elements.filter((e) => e.type === "node").map((e) => [e.id, e]));
  const relations = elements.filter((e) => e.type === "relation");
  // 역 노드: 이름이 빠진 정차 위치의 이름과, 정차 위치에 없는 영어 이름을 채우는 데 쓴다
  const stationNodes = (
    await overpass(`[out:json][timeout:120];(node["railway"="station"](${bbox});node["public_transport"="station"](${bbox}););out body;`)
  ).filter((n) => n.lat !== undefined && n.lon !== undefined && (n.tags?.["name:ko"] ?? n.tags?.name));
  const nearestStation = (point: { lat: number; lon: number }, ko?: string, within = 0.5) =>
    stationNodes
      .filter((n) => (!ko || baseKo(n.tags!["name:ko"] ?? n.tags!.name) === ko) && km(n as { lat: number; lon: number }, point) < within)
      .sort((a, b) => km(a as { lat: number; lon: number }, point) - km(b as { lat: number; lon: number }, point))[0];

  type Station = { id: string; ko: string; en: string; lat: number; lon: number; lines: Set<string> };
  const stations: Station[] = [];
  // 같은 이름이고 1km 안이면 같은 역(환승역)으로 합친다. 이름이 같아도 멀면 다른 역이다 (예: 양평)
  const stationFor = (node: OsmElement, line: string): Station | null => {
    if (node.lat === undefined || node.lon === undefined || !inBox(node.lat, node.lon)) return null;
    const point = { lat: node.lat, lon: node.lon };
    const named = node.tags?.["name:ko"] ?? node.tags?.name ?? nearestStation(point)?.tags?.["name:ko"] ?? nearestStation(point)?.tags?.name ?? "";
    const ko = baseKo(named);
    if (!ko) return null;
    let station = stations.find((s) => s.ko === ko && km(s, point) < 1);
    if (!station) {
      station = { id: `s${stations.length + 1}`, ko, en: baseEn(node.tags?.["name:en"] ?? ""), lat: point.lat, lon: point.lon, lines: new Set() };
      stations.push(station);
    }
    if (!station.en && node.tags?.["name:en"]) station.en = baseEn(node.tags["name:en"]);
    if (!station.en) {
      const en = nearestStation(point, ko, 1)?.tags?.["name:en"];
      if (en) station.en = baseEn(en);
    }
    station.lines.add(line);
    return station;
  };

  const edges = new Map<string, Set<string>>();
  for (const line of LINES) {
    const set = new Set<string>();
    const rels = relations.filter((r) => r.tags?.ref === line.ref && !EXPRESS.test(`${r.tags?.name ?? ""} ${r.tags?.["name:en"] ?? ""}`));
    for (const rel of rels) {
      const stops = (rel.members ?? [])
        .filter((m) => m.type === "node" && m.role.startsWith("stop"))
        .map((m) => nodes.get(m.ref))
        .filter((n): n is OsmElement => !!n)
        .map((n) => stationFor(n, line.id))
        .filter((s): s is Station => !!s);
      for (let i = 1; i < stops.length; i++) {
        const [a, b] = [stops[i - 1].id, stops[i].id];
        // 역 사이가 너무 멀면(영역 밖으로 나갔다 들어온 경우) 잇지 않는다
        if (a !== b && km(stops[i - 1], stops[i]) < 12) set.add([a, b].sort().join("-"));
      }
    }
    edges.set(line.id, set);
    if (set.size === 0) console.warn(`no edges for ${line.id}`);
  }

  const colourOf = (ref: string) => relations.find((r) => r.tags?.ref === ref && r.tags?.colour)?.tags?.colour ?? "#888888";
  const out = {
    source: {
      name: "© OpenStreetMap contributors",
      license: "ODbL 1.0",
      url: "https://www.openstreetmap.org/copyright",
      via: "Overpass API",
    },
    fetchedAt: new Date().toISOString().slice(0, 10),
    bbox: BBOX,
    lines: LINES.map((line) => ({
      id: line.id,
      ko: line.ko,
      en: line.en,
      short: line.short,
      colour: colourOf(line.ref),
      edges: [...(edges.get(line.id) ?? [])].map((key) => key.split("-")),
    })),
    stations: stations
      .filter((s) => [...edges.values()].some((set) => [...set].some((key) => key.split("-").includes(s.id))))
      .map((s) => ({ id: s.id, ko: s.ko, en: s.en, lat: +s.lat.toFixed(5), lon: +s.lon.toFixed(5), lines: [...s.lines] })),
  };
  const file = path.join(process.cwd(), "data/transit/seoul-subway.json");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out));
  console.log(`saved ${out.stations.length} stations, ${out.lines.reduce((n, l) => n + l.edges.length, 0)} edges → ${file}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
