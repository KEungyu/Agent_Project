// 지하철 지도 화면의 배경과 선로 모양을 OpenStreetMap(Overpass API)에서 받아 public/transit/map.json으로 저장한다.
// 데이터: © OpenStreetMap contributors, ODbL 1.0. 화면은 지도 탭을 열 때 이 파일을 한 번 불러온다.
// 담는 것: 노선별 실제 선로 모양, 한강 중심선, 고속도로(motorways)·간선도로(roads), 서울 25개 구 이름(한·영·일·중)과 중심점.
// 실행: npx tsx scripts/transit/fetch-map.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MAP_BBOX } from "../../lib/transit/subway";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "MajungiClassProject/1.0 (student demo app)";
// 화면 범위 (역 자료보다 넓게: 축소해도 배경이 끊겨 보이지 않게)
const BBOX = MAP_BBOX;
const bbox = BBOX.join(",");

// OSM ref → 앱의 노선 id (scripts/transit/fetch-subway.ts와 같은 짝)
const LINE_IDS: Record<string, string> = {
  "1": "L1", "2": "L2", "3": "L3", "4": "L4", "5": "L5", "6": "L6", "7": "L7", "8": "L8", "9": "L9",
  공항철도: "AREX", "경의·중앙": "GJ", "수인·분당": "SB", 신분당: "SBD", 경춘: "GC", W: "UI", Silim: "SL", "김포 골드라인": "GG", 서해: "SH",
};
const EXPRESS = /급행|특급|Rapid|Express/i;

type LatLon = [number, number];
type OsmWay = { type: "way"; id: number; geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> };
type OsmRel = { type: "relation"; id: number; tags?: Record<string, string>; members?: { type: string; ref: number }[]; center?: { lat: number; lon: number } };

// 공개 Overpass 서버는 붐비면 429·504를 준다: 잠시 쉬었다가 몇 번 다시 묻는다
async function overpass<T>(query: string): Promise<T[]> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(290_000),
    });
    if (res.ok) return ((await res.json()) as { elements: T[] }).elements;
    if (attempt >= 4 || ![429, 502, 503, 504].includes(res.status)) throw new Error(`Overpass ${res.status}`);
    console.warn(`Overpass ${res.status}, retrying (${attempt})`);
    await new Promise((r) => setTimeout(r, 20_000 * attempt));
  }
}

const inBox = ([lat, lon]: LatLon) => lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3];
// 범위 밖으로 나가는 곳에서 선을 끊는다
function clip(line: LatLon[]): LatLon[][] {
  const out: LatLon[][] = [];
  let current: LatLon[] = [];
  for (const p of line) {
    if (inBox(p)) current.push(p);
    else if (current.length) {
      if (current.length > 1) out.push(current);
      current = [];
    }
  }
  if (current.length > 1) out.push(current);
  return out;
}
// 더글러스-포이커 단순화 (경도는 위도 37.5°에 맞게 줄여 거리를 잰다)
function simplify(line: LatLon[], tolerance: number): LatLon[] {
  if (line.length < 3) return line;
  const k = Math.cos((37.5 * Math.PI) / 180);
  const dist = (p: LatLon, a: LatLon, b: LatLon) => {
    const [px, py, ax, ay, bx, by] = [p[1] * k, p[0], a[1] * k, a[0], b[1] * k, b[0]];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let best = -1;
    let bestD = 0;
    for (let i = s + 1; i < e; i++) {
      const d = dist(line[i], line[s], line[e]);
      if (d > bestD) [best, bestD] = [i, d];
    }
    if (best > 0 && bestD > tolerance) {
      keep[best] = true;
      stack.push([s, best], [best, e]);
    }
  }
  return line.filter((_, i) => keep[i]);
}
const round = (line: LatLon[]): LatLon[] => line.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
const prepare = (geometry: { lat: number; lon: number }[] | undefined, tolerance: number) =>
  clip((geometry ?? []).map((p) => [p.lat, p.lon] as LatLon)).map((part) => round(simplify(part, tolerance)));

async function main() {
  // 1) 노선별 실제 선로 (급행·특급 운행 계통은 같은 선로라 뺀다)
  const trackElements = await overpass<OsmWay | OsmRel>(
    `[out:json][timeout:270];rel["route"~"^(subway|train|light_rail)$"](${bbox})->.r;.r out body;way(r.r)["railway"];out geom;`,
  );
  const ways = new Map(trackElements.filter((e): e is OsmWay => e.type === "way").map((w) => [w.id, w]));
  const tracks: { line: string; paths: LatLon[][] }[] = [];
  for (const [ref, id] of Object.entries(LINE_IDS)) {
    const wayIds = new Set<number>();
    for (const rel of trackElements.filter((e): e is OsmRel => e.type === "relation" && e.tags?.ref === ref)) {
      if (EXPRESS.test(`${rel.tags?.name ?? ""} ${rel.tags?.["name:en"] ?? ""}`)) continue;
      for (const m of rel.members ?? []) if (m.type === "way" && ways.has(m.ref)) wayIds.add(m.ref);
    }
    const paths = [...wayIds].flatMap((wid) => prepare(ways.get(wid)!.geometry, 0.00008)).filter((p) => p.length > 1);
    tracks.push({ line: id, paths });
  }

  // 2) 한강 중심선
  const river = (await overpass<OsmWay>(`[out:json][timeout:100];way["waterway"="river"]["name"="한강"](${bbox});out geom;`))
    .flatMap((w) => prepare(w.geometry, 0.0003));

  // 3) 고속도로·간선도로 (배경). 축소했을 때는 고속도로만 보이도록 나눠 담는다
  const roadWays = await overpass<OsmWay>(`[out:json][timeout:270];way["highway"~"^(motorway|trunk)$"](${bbox});out geom;`);
  const roadsOf = (kind: string) =>
    roadWays
      .filter((w) => w.tags?.highway === kind)
      .flatMap((w) => prepare(w.geometry, 0.0006))
      .filter((p) => p.length > 1);
  const motorways = roadsOf("motorway");
  const roads = roadsOf("trunk");

  // 4) 서울 25개 구 이름과 중심점 (배경 글자)
  const districts = (
    await overpass<OsmRel>(
      `[out:json][timeout:180];area["name"="서울특별시"]["admin_level"="4"]->.seoul;rel["boundary"="administrative"]["admin_level"="6"](area.seoul);out center tags;`,
    )
  )
    .filter((r) => r.center && r.tags?.name)
    .map((r) => ({
      ko: r.tags!.name,
      en: r.tags!["name:en"] ?? "",
      // 일본어·중국어 화면용 (없으면 화면이 영어 이름을 쓴다)
      ja: r.tags!["name:ja"] ?? "",
      zh: r.tags!["name:zh-Hans"] ?? r.tags!["name:zh"] ?? "",
      lat: +r.center!.lat.toFixed(4),
      lon: +r.center!.lon.toFixed(4),
    }));

  const out = {
    source: { name: "© OpenStreetMap contributors", license: "ODbL 1.0", url: "https://www.openstreetmap.org/copyright", via: "Overpass API" },
    fetchedAt: new Date().toISOString().slice(0, 10),
    bbox: BBOX,
    tracks,
    river,
    motorways,
    roads,
    districts,
  };
  const file = path.join(process.cwd(), "public/transit/map.json");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out));
  const count = (lines: LatLon[][]) => lines.reduce((n, l) => n + l.length, 0);
  console.log(
    `saved tracks ${tracks.reduce((n, t) => n + count(t.paths), 0)} pts, river ${count(river)} pts, motorways ${count(motorways)} pts, trunk roads ${count(roads)} pts, districts ${districts.length} → ${file}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
