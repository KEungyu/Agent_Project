// 지역별 전철 노선·역 데이터를 OpenStreetMap(Overpass API)에서 받아 data/transit/<region>-subway.json으로 저장한다.
// 데이터: © OpenStreetMap contributors, ODbL 1.0. 앱은 저장된 파일만 읽고 실행 중에 OSM을 부르지 않는다.
// 실행: npm run transit:fetch -- [seoul|busan|daegu] [cached-overpass.json]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "MajungiClassProject/1.0 (student demo app)";
// 수도권 외곽 연결까지 포함한다 (남, 서, 북, 동). 화면 초기 범위와 데이터 수집 범위는 별개다.
const region = process.argv[2] ?? "seoul";
if (!["seoul", "busan", "daegu"].includes(region)) throw new Error("region: seoul | busan | daegu");
// optional cached Overpass JSON avoids repeating public API calls while reviewing data.
const cached: OsmElement[] | undefined = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], "utf8")).elements : undefined;
const BBOX = region === "busan" ? [35.0, 128.75, 35.6, 129.4] : region === "daegu" ? [35.65, 128.40, 36.1, 128.95] : [36.7, 126.3, 38.15, 128.0];

// 앱에서 보여 줄 노선: OSM ref → 화면 표기. 급행·특급 운행 계통은 정차역이 일부라서 뺀다.
const SEOUL_LINES: { ref: string; id: string; ko: string; en: string; short: string }[] = [
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
const LINES = region === "seoul" ? SEOUL_LINES : [
  ...SEOUL_LINES.slice(0, region === "busan" ? 4 : 3),
  ...(region === "busan" ? [
    { ref: "BGL", id: "BGL", ko: "부산김해경전철", en: "Busan–Gimhae Light Rail", short: "BGL" },
    { ref: "동해", id: "DH", ko: "동해선", en: "Donghae", short: "DH" },
  ] : []),
];
const EXPRESS = /급행|특급|Rapid|Express/i;
// OSM 영어 이름 누락·오류 보완. 부천시청: https://www.bucheonphil.or.kr/eng/M0000088/content/view.do (2026-10-07)
const EN_FIX: Record<string, string> = { 정부과천청사: "Government Complex Gwacheon", 부천시청: "Bucheon City Hall" };

type OsmMember = { type: string; ref: number; role: string };
type OsmElement = { type: "node" | "relation"; id: number; lat?: number; lon?: number; tags?: Record<string, string>; members?: OsmMember[] };

// 공개 Overpass 서버는 붐비면 429·504를 준다: 잠시 쉬었다가 몇 번 다시 묻는다
async function overpass(query: string): Promise<OsmElement[]> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(240_000),
    });
    if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
    if (attempt >= 4 || ![429, 502, 503, 504].includes(res.status)) throw new Error(`Overpass ${res.status}`);
    console.warn(`Overpass ${res.status}, retrying (${attempt})`);
    await new Promise((r) => setTimeout(r, 20_000 * attempt));
  }
}

const inBox = (lat: number, lon: number) => lat >= BBOX[0] && lat <= BBOX[2] && lon >= BBOX[1] && lon <= BBOX[3];
// "서울역", "서울 (1호선)" 같은 표기 차이를 지우고 역 이름만 남긴다
const baseKo = (name: string) => name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\d+호선$/, "").replace(/역$/, "").trim();
const baseEn = (name: string) => name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+Station$/i, "").replace(/\s+Line\s*\d+$/i, "").trim();
// 일본어·중국어 역 이름 (OSM name:ja, name:zh-Hans → name:zh). 괄호 속 읽기와 "駅"·"站"을 지운다
const baseCjk = (name: string | undefined) => name?.replace(/\s*[(（].*?[)）]\s*/g, "").replace(/[駅站]$/, "").trim() || undefined;
const cjkNames = (tags: Record<string, string> | undefined) => ({ ja: baseCjk(tags?.["name:ja"]), zh: baseCjk(tags?.["name:zh-Hans"] ?? tags?.["name:zh"]) });
const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 88.2);

async function main() {
  const bbox = BBOX.join(",");
  const elements = cached ?? await overpass(
    `[out:json][timeout:220];rel["route"~"^(subway|train|light_rail|monorail)$"](${bbox})->.r;.r out body;node(r.r);out body;`,
  );
  const nodes = new Map(elements.filter((e) => e.type === "node").map((e) => [e.id, e]));
  const relations = elements.filter((e) => e.type === "relation");
  // 역 노드: 이름이 빠진 정차 위치의 이름과, 정차 위치에 없는 영어 이름을 채우는 데 쓴다
  const stationNodes = (
    cached?.filter((n) => n.type === "node" && (n.tags?.railway === "station" || n.tags?.public_transport === "station")) ??
    await overpass(`[out:json][timeout:120];(node["railway"="station"](${bbox});node["public_transport"="station"](${bbox}););out body;`)
  ).filter((n) => n.lat !== undefined && n.lon !== undefined && (n.tags?.["name:ko"] ?? n.tags?.name));
  const nearestStation = (point: { lat: number; lon: number }, ko?: string, within = 0.5) =>
    stationNodes
      .filter((n) => (!ko || baseKo(n.tags!["name:ko"] ?? n.tags!.name) === ko) && km(n as { lat: number; lon: number }, point) < within)
      .sort((a, b) => km(a as { lat: number; lon: number }, point) - km(b as { lat: number; lon: number }, point))[0];

  type Station = {
    id: string;
    ko: string;
    en: string;
    names: { ja?: string; zh?: string };
    lat: number;
    lon: number;
    lines: Set<string>;
    codes: Record<string, string>;
  };
  const stations: Station[] = [];
  // 같은 이름이고 1km 안이면 같은 역(환승역)으로 합친다. 이름이 같아도 멀면 다른 역이다 (예: 양평)
  const stationFor = (node: OsmElement, line: string): Station | null => {
    if (node.lat === undefined || node.lon === undefined || !inBox(node.lat, node.lon)) return null;
    const point = { lat: node.lat, lon: node.lon };
    const named = node.tags?.["name:ko"] ?? node.tags?.name ?? nearestStation(point)?.tags?.["name:ko"] ?? nearestStation(point)?.tags?.name ?? "";
    const ko = baseKo(named);
    if (!ko) return null;
    // 부전 도시철도역과 동해선역은 가까워도 공식 환승역이 아니다. 별도 점으로 보존한다.
    let station = stations.find((s) => s.ko === ko && km(s, point) < 1 &&
      !(region === "busan" && ko === "부전" && (s.lines.has("DH") !== (line === "DH"))));
    if (!station) {
      station = { id: `s${stations.length + 1}`, ko, en: baseEn(node.tags?.["name:en"] ?? ""), names: {}, lat: point.lat, lon: point.lon, lines: new Set(), codes: {} };
      stations.push(station);
    }
    if (!station.en && node.tags?.["name:en"]) station.en = baseEn(node.tags["name:en"]);
    if (!station.en) {
      const en = nearestStation(point, ko, 1)?.tags?.["name:en"];
      if (en) station.en = baseEn(en);
    }
    // 정차 위치에 없으면 같은 이름의 가까운 역 노드에서 가져온다
    const cjk = cjkNames(node.tags);
    const near: Station["names"] = !cjk.ja || !cjk.zh ? cjkNames(nearestStation(point, ko, 1)?.tags) : {};
    station.names.ja ??= cjk.ja ?? near.ja;
    station.names.zh ??= cjk.zh ?? near.zh;
    station.lines.add(line);
    // 역 번호 (표지판에 쓰인 번호, 예: 명동 424). 정차 위치의 ref에 있다
    const code = node.tags?.ref?.trim();
    if (code && /^[A-Z]?\d{2,4}(-\d)?$|^[A-Z]{1,2}\d{1,3}$/.test(code) && !station.codes[line]) station.codes[line] = code;
    return station;
  };

  const edges = new Map<string, Set<string>>();
  // 운행 계통: 노선 · 실제 종착역(표지판의 "○○ 방면") · 지원 범위 안에서 서는 역 순서
  const services: { line: string; to: string; stops: string[] }[] = [];
  for (const line of LINES) {
    const set = new Set<string>();
    const rels = relations.filter((r) => r.tags?.ref === line.ref && !EXPRESS.test(`${r.tags?.name ?? ""} ${r.tags?.["name:en"] ?? ""}`));
    for (const rel of rels) {
      const rawStops = (rel.members ?? [])
        .filter((m) => m.type === "node" && m.role.startsWith("stop"))
        .map((m) => nodes.get(m.ref))
        .map((n) => n ? stationFor(n, line.id) : null);
      // 누락·범위 밖 역을 건너뛰어 가짜 인접 간선을 만들지 않는다. 연속 구간별로 보존한다.
      const segments: Station[][] = [[]];
      for (const stop of rawStops) {
        if (stop) segments[segments.length - 1].push(stop);
        else if (segments[segments.length - 1].length) segments.push([]);
      }
      for (const stops of segments.filter((segment) => segment.length > 1)) {
        // OSM 동해선 관계의 누락 보완: 공식 노선도 안락↔부산원동↔재송, 좌표·이름은 OSM 역 노드.
        // https://www2.humetro.busan.kr/homepage/cyberstation/mapeng.do (2026-10-07)
        if (region === "busan" && line.id === "DH" && !stops.some((s) => s.ko === "부산원동")) {
          const node = stationNodes.find((n) => n.tags?.name === "부산원동");
          const station = node && stationFor(node, line.id);
          const gap = stops.findIndex((s, i) => [s.ko, stops[i + 1]?.ko].sort().join() === ["안락", "재송"].sort().join());
          if (!station || gap < 0) throw new Error("Check Busanwondong against the official map");
          stops.splice(gap + 1, 0, station);
        }
        const ids = stops.map((st) => st.id).filter((id, i, all) => id !== all[i - 1]);
        const to = baseKo(rel.tags?.to ?? (rel.tags?.name ?? "").split(/→|->/).pop() ?? "");
        if (to && ids.length > 1) services.push({ line: line.id, to, stops: ids });
        for (let i = 1; i < stops.length; i++) {
          const [a, b] = [stops[i - 1].id, stops[i].id];
          // 역 사이가 너무 멀면(영역 밖으로 나갔다 들어온 경우) 잇지 않는다
          if (a !== b && km(stops[i - 1], stops[i]) < 12) set.add([a, b].sort().join("-"));
        }
      }
    }
    edges.set(line.id, set);
    if (set.size === 0) console.warn(`no edges for ${line.id}`);
  }

  // 지원 범위 밖 종착역(예: 오이도)의 영어·일본어·중국어 이름: 운행 계통의 정차 위치 노드에서 찾는다 (방면 안내용)
  const termini: Record<string, { en: string; ja?: string; zh?: string }> = {};
  for (const to of new Set(services.map((sv) => sv.to))) {
    if (stations.some((st) => st.ko === to)) continue;
    const node = [...nodes.values()].find((n) => n.tags && baseKo(n.tags["name:ko"] ?? n.tags.name ?? "") === to && n.tags["name:en"]);
    if (node) termini[to] = { en: baseEn(node.tags!["name:en"]), ...cjkNames(node.tags) };
  }
  // 정차 위치에 영어 이름이 없으면 범위 밖 역 노드에서 찾는다 (순환 계통 이름은 역이 아니라 뺀다)
  const missing = [...new Set(services.map((sv) => sv.to))].filter((to) => !termini[to] && !/순환/.test(to) && !stations.some((st) => st.ko === to));
  if (missing.length && !cached) {
    const far = await overpass(`[out:json][timeout:120];node["railway"="station"]["name"~"^(${missing.join("|")})(역)?$"];out body;`);
    for (const to of missing) {
      const node = far.find((n) => n.tags && baseKo(n.tags["name:ko"] ?? n.tags.name ?? "") === to && n.tags["name:en"]);
      if (node) termini[to] = { en: baseEn(node.tags!["name:en"]), ...cjkNames(node.tags) };
    }
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
    // 같은 계통은 한 번만
    termini,
    services: services.filter((sv, i) => services.findIndex((o) => o.line === sv.line && o.to === sv.to && o.stops.join() === sv.stops.join()) === i),
    stations: stations
      .filter((s) => [...edges.values()].some((set) => [...set].some((key) => key.split("-").includes(s.id))))
      .map((s) => ({
        id: s.id,
        ko: s.ko,
        en: EN_FIX[s.ko] ?? s.en,
        ...(s.names.ja || s.names.zh ? { names: s.names } : {}),
        lat: +s.lat.toFixed(5),
        lon: +s.lon.toFixed(5),
        lines: [...s.lines],
        codes: s.codes,
      })),
  };
  const file = path.join(process.cwd(), `data/transit/${region}-subway.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out));
  console.log(`saved ${out.stations.length} stations, ${out.lines.reduce((n, l) => n + l.edges.length, 0)} edges → ${file}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
