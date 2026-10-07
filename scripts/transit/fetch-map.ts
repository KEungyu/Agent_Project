// 지하철 지도 화면의 배경과 선로 모양을 OpenStreetMap(Overpass API)에서 받아 public/transit/map.json으로 저장한다.
// 데이터: © OpenStreetMap contributors, ODbL 1.0. 화면은 지도 탭을 열 때 이 파일을 한 번 불러온다.
// 담는 것: 노선별 실제 선로 모양, 한강 중심선, 고속도로(motorways)·간선도로(roads), 서울 25개 구 이름(한·영·일·중)과 중심점.
// 실행: npx tsx scripts/transit/fetch-map.ts [seoul|busan|daegu|daejeon|gwangju]
// 지역(부산·대구·대전·광주)은 public/transit/map-<지역>.json: 선로·주요 하천(큰 강과 도심 하천)·큰 도로·구 이름, 부산은 해안선까지.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MAP_BBOX } from "../../lib/transit/subway";

// 기본 서버가 붐비면 OVERPASS_URL로 다른 공개 Overpass 서버(같은 OSM 자료)를 쓴다
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const USER_AGENT = "MajungiClassProject/1.0 (student demo app)";
const region = process.argv[2] ?? "seoul";
// 지역 설정: 큰 강(넓게 그림)·도심 하천(가늘게)·시 이름(구 경계 찾기)·해안선 여부. 노선 짝은 fetch-subway.ts와 같다
const REGIONS: Record<string, { rivers: string[]; streams: string[]; city: string; coast: boolean; lines: Record<string, string> }> = {
  busan: { rivers: ["낙동강"], streams: ["수영강", "온천천"], city: "부산광역시", coast: true, lines: { "1": "L1", "2": "L2", "3": "L3", "4": "L4", BGL: "BGL", 동해: "DH" } },
  daegu: { rivers: ["낙동강", "금호강"], streams: ["신천"], city: "대구광역시", coast: false, lines: { "1": "L1", "2": "L2", "3": "L3" } },
  daejeon: { rivers: ["금강"], streams: ["갑천", "대전천", "유등천"], city: "대전광역시", coast: false, lines: { "1": "L1" } },
  // OSM은 2026-10-07 기준 광주를 "전남광주통합특별시" 아래에 둔다: 그 안의 구 중 노선도 범위에 드는 것만 쓴다
  gwangju: { rivers: ["영산강"], streams: ["광주천", "황룡강"], city: "전남광주통합특별시", coast: false, lines: { "1": "L1" } },
};
if (region !== "seoul" && !REGIONS[region]) throw new Error("region: seoul | busan | daegu | daejeon | gwangju");
const config = REGIONS[region];
// 화면 범위 (역 자료보다 넓게: 축소해도 배경이 끊겨 보이지 않게). 지역은 역 자료 범위에서 0.04° 넓힌다
const BBOX: readonly number[] = config
  ? (JSON.parse(readFileSync(path.join(process.cwd(), `data/transit/${region}-subway.json`), "utf8")).bbox as number[]).map((v, i) => +(v + (i < 2 ? -0.04 : 0.04)).toFixed(3))
  : MAP_BBOX;
const bbox = BBOX.join(",");

// OSM ref → 앱의 노선 id (scripts/transit/fetch-subway.ts와 같은 짝)
const LINE_IDS: Record<string, string> = config?.lines ?? {
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
    let res: Response;
    try {
      res = await fetch(OVERPASS, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(290_000),
      });
    } catch (error) {
      // 붐빌 때 서버가 연결을 끊기도 한다: 응답 오류와 같이 쉬었다가 다시 묻는다
      if (attempt >= 5) throw error;
      console.warn(`Overpass connection failed, retrying (${attempt})`);
      await new Promise((r) => setTimeout(r, 30_000 * attempt));
      continue;
    }
    if (res.ok) {
      try {
        return ((await res.json()) as { elements: T[] }).elements;
      } catch (error) {
        // 큰 응답을 받는 도중 연결이 끊기면 다시 묻는다
        if (attempt >= 5) throw error;
        console.warn(`Overpass response cut off, retrying (${attempt})`);
        await new Promise((r) => setTimeout(r, 30_000 * attempt));
        continue;
      }
    }
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
    `[out:json][timeout:270];rel["route"~"^(subway|train|light_rail|monorail)$"](${bbox})->.r;.r out body;way(r.r)["railway"];out geom;`,
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

  // 2) 강 중심선 (서울은 한강). 지역은 큰 강과 도심 하천을 나눠 담는다 (화면에서 굵기가 다르다)
  const waterOf = async (names: string[]) =>
    names.length
      ? (await overpass<OsmWay>(`[out:json][timeout:100];way["waterway"~"^(river|stream)$"]["name"~"^(${names.join("|")})$"](${bbox});out geom;`)).flatMap((w) => prepare(w.geometry, 0.0003))
      : [];
  const river = await waterOf(config?.rivers ?? ["한강"]);
  const streams = config ? await waterOf(config.streams) : [];
  // 해안선 (부산). 바다를 칠하지 않고 해안을 따라 옅은 물색 띠로만 그린다
  const coast = config?.coast
    ? (await overpass<OsmWay>(`[out:json][timeout:180];way["natural"="coastline"](${bbox});out geom;`))
        .flatMap((w) => prepare(w.geometry, 0.0012))
        // 작은 섬·방파제 조각은 뺀다 (위·경도 폭 0.01° 미만)
        .filter((p) => p.length > 2 && Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])) + Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1])) > 0.01)
    : [];

  // 3) 고속도로·간선도로 (배경). 축소했을 때는 고속도로만 보이도록 나눠 담는다
  const roadWays = await overpass<OsmWay>(`[out:json][timeout:270];way["highway"~"^(motorway|trunk)$"](${bbox});out geom;`);
  const roadsOf = (kind: string) =>
    roadWays
      .filter((w) => w.tags?.highway === kind)
      .flatMap((w) => prepare(w.geometry, 0.0006))
      .filter((p) => p.length > 1);
  const motorways = roadsOf("motorway");
  const roads = roadsOf("trunk");

  // 4) 구 이름과 중심점 (배경 글자). 서울 25개 구, 지역은 그 광역시의 구·군
  const districts = (
    await overpass<OsmRel>(
      `[out:json][timeout:180];area["name"="${config?.city ?? "서울특별시"}"]["admin_level"="4"]->.city;rel["boundary"="administrative"]["admin_level"="6"](area.city);out center tags;`,
    )
  )
    .filter((r) => r.center && r.tags?.name && (!config || inBox([r.center.lat, r.center.lon])))
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
    ...(config ? { streams, coast } : {}),
    motorways,
    roads,
    districts,
  };
  const file = path.join(process.cwd(), config ? `public/transit/map-${region}.json` : "public/transit/map.json");
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
