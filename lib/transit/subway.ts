import data from "../../data/transit/seoul-subway.json";
import { localStationName, localStationNames } from "./station-names";

// 수도권 전철 노선도 데이터 (OpenStreetMap, ODbL 1.0 — scripts/transit/fetch-subway.ts로 받는다).
// 연결 관계·환승역만 담는다: 시간표·소요 시간·요금·급행 정차·출구·엘리베이터는 이 데이터에 없다.

export type SubwayLine = { id: string; ko: string; en: string; short: string; colour: string; edges: [string, string][] };
export type SubwayStation = {
  id: string;
  ko: string;
  en: string;
  names?: { ja?: string; zh?: string }; // OSM name:ja, name:zh-Hans(없으면 name:zh)
  lat: number;
  lon: number;
  lines: string[];
  codes: Record<string, string>;
};
export type SubwayData = {
  source: { name: string; license: string; url: string; via: string };
  fetchedAt: string;
  bbox: readonly number[];
  lines: SubwayLine[];
  stations: SubwayStation[];
  // 운행 계통: 실제 종착역(표지판의 "○○ 방면")과 지원 범위 안에서 서는 역 순서
  services: { line: string; to: string; stops: string[] }[];
  // 지원 범위 밖 종착역의 영어·일본어·중국어 이름 (방면 안내용)
  termini: Record<string, { en: string; ja?: string; zh?: string }>;
};

export const SUBWAY = data as unknown as SubwayData;
const stationById = new Map(SUBWAY.stations.map((s) => [s.id, s]));
const lineById = new Map(SUBWAY.lines.map((l) => [l.id, l]));
export const getStation = (id: string) => stationById.get(id);
export const getLine = (id: string) => lineById.get(id);

// 화면 언어로 쓴 역 이름. 일본어·중국어는 OSM 이름, 불어·스페인어·베트남어·인니어는 설명 단어만 옮긴 이름(station-names.ts),
// 그 밖에는 영어 표기(역 표지판의 로마자)를 쓴다.
// 중국어 이름이 없으면 가나가 없는 일본어 한자 이름으로, 그것도 없으면 영어로 대신한다
const KANA = /[\u3040-\u30ff]/;
export function stationName(station: Pick<SubwayStation, "ko" | "en" | "names">, language: string): string {
  if (language === "ko") return station.ko;
  const local = localStationName(station.ko, language);
  if (local) return local;
  const ja = station.names?.ja;
  if (language === "ja" && ja) return ja;
  if (language === "zh-CN") {
    const zh = station.names?.zh ?? (ja && !KANA.test(ja) ? ja : undefined);
    if (zh) return zh;
  }
  return station.en || station.ko;
}

// 방면에 쓰는 종착역 이름: 노선도 안의 역이면 그 역, 범위 밖이면 termini 자료 (없으면 한국어 그대로)
export function terminusName(ko: string, language: string): string {
  const station = SUBWAY.stations.find((s) => s.ko === ko);
  if (station) return stationName(station, language);
  const far = SUBWAY.termini?.[ko];
  return far ? stationName({ ko, en: far.en, names: { ja: far.ja, zh: far.zh } }, language) : ko;
}

// 화면 언어로 쓴 노선 이름. 번호 노선은 언어별 틀로, 이름 노선은 일본어·중국어만 따로 적는다
const LINE_NUMBER: Record<string, string> = {
  en: "Line {n}",
  ja: "{n}号線",
  "zh-CN": "{n}号线",
  fr: "Ligne {n}",
  es: "Línea {n}",
  vi: "Tuyến {n}",
  th: "สาย {n}",
  id: "Jalur {n}",
};
const LINE_CJK: Record<string, { ja: string; zh: string }> = {
  AREX: { ja: "空港鉄道(AREX)", zh: "机场铁路(AREX)" },
  GJ: { ja: "京義・中央線", zh: "京义·中央线" },
  SB: { ja: "水仁・盆唐線", zh: "水仁·盆唐线" },
  SBD: { ja: "新盆唐線", zh: "新盆唐线" },
  GC: { ja: "京春線", zh: "京春线" },
  UI: { ja: "牛耳新設線", zh: "牛耳新设线" },
  SL: { ja: "新林線", zh: "新林线" },
  GG: { ja: "金浦ゴールドライン", zh: "金浦黄金线" },
  SH: { ja: "西海線", zh: "西海线" },
};
export function lineName(line: SubwayLine, language: string): string {
  if (language === "ko") return line.ko;
  if (language === "en") return line.en;
  const cjk = LINE_CJK[line.id];
  if (cjk && language === "ja") return cjk.ja;
  if (cjk && language === "zh-CN") return cjk.zh;
  const template = LINE_NUMBER[language] ?? LINE_NUMBER.en;
  // 번호 노선은 "1"…"9", 이름 노선은 영어 이름을 틀에 넣는다 (예: Ligne Shinbundang)
  return template.replace("{n}", /^\d$/.test(line.short) ? line.short : line.en);
}

// 역 이름 찾기: 한국어·영어·일본어·중국어 이름(띄어쓰기·하이픈 무시, 예: "myeongdong"), "역"·"Station" 생략, 역 번호(예: "424").
// 같은 이름이 여럿이면 모두 돌려준다(동명역 구분)
const norm = (text: string) =>
  text
    .toLowerCase()
    // 악센트 무시 (universite = université)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .replace(/\s*station$/i, "")
    .replace(/역$/, "")
    .replace(/[駅站]$/, "")
    .replace(/[\s'’.\-–]/g, "");
const namesOf = (s: SubwayStation) => [s.ko, s.en, s.names?.ja, s.names?.zh, ...localStationNames(s.ko)].filter((name): name is string => !!name).map(norm);
export function findStations(query: string, limit = 8): SubwayStation[] {
  const q = norm(query.trim());
  if (!q) return [];
  const code = q.toUpperCase();
  const exact = SUBWAY.stations.filter((s) => namesOf(s).includes(q) || Object.values(s.codes ?? {}).includes(code));
  if (exact.length) return exact;
  // 앞부분이 맞는 역을 먼저, 그다음 중간에 들어 있는 역
  const starts = SUBWAY.stations.filter((s) => namesOf(s).some((name) => name.startsWith(q)));
  const contains = SUBWAY.stations.filter((s) => !starts.includes(s) && namesOf(s).some((name) => name.includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

// 노선별 이웃 역
const neighbours = new Map<string, { station: string; line: string }[]>();
for (const line of SUBWAY.lines) {
  for (const [a, b] of line.edges) {
    neighbours.set(a, [...(neighbours.get(a) ?? []), { station: b, line: line.id }]);
    neighbours.set(b, [...(neighbours.get(b) ?? []), { station: a, line: line.id }]);
  }
}

export type SubwayLeg = { line: string; from: string; to: string; next: string; stations: string[]; stops: number };
export type SubwayRoute = { legs: SubwayLeg[]; stops: number; transfers: number };

const TRANSFER_COST = 5; // 환승 1번 = 역 5개 만큼으로 쳐서 갈아타기가 적은 길을 고른다 (시간 추정이 아니다)

// 역 수와 환승 횟수만으로 고른 연결 경로. 소요 시간·요금·운행 여부는 계산하지 않는다
export function subwayRoute(fromId: string, toId: string): SubwayRoute | null {
  if (!stationById.has(fromId) || !stationById.has(toId) || fromId === toId) return null;
  type State = { station: string; line: string | null };
  const key = (s: State) => `${s.station}|${s.line ?? ""}`;
  const dist = new Map<string, number>([[key({ station: fromId, line: null }), 0]]);
  const prev = new Map<string, State>();
  const queue: { state: State; cost: number }[] = [{ state: { station: fromId, line: null }, cost: 0 }];
  let goal: State | null = null;
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { state, cost } = queue.shift()!;
    if (cost > (dist.get(key(state)) ?? Infinity)) continue;
    if (state.station === toId) {
      goal = state;
      break;
    }
    for (const next of neighbours.get(state.station) ?? []) {
      const step = 1 + (state.line && state.line !== next.line ? TRANSFER_COST : 0);
      const nextState = { station: next.station, line: next.line };
      const nextCost = cost + step;
      if (nextCost < (dist.get(key(nextState)) ?? Infinity)) {
        dist.set(key(nextState), nextCost);
        prev.set(key(nextState), state);
        queue.push({ state: nextState, cost: nextCost });
      }
    }
  }
  if (!goal) return null;

  const path: State[] = [];
  for (let s: State | undefined = goal; s; s = prev.get(key(s))) path.unshift(s);
  const legs: SubwayLeg[] = [];
  for (let i = 1; i < path.length; i++) {
    const { station, line } = path[i];
    const last = legs[legs.length - 1];
    if (last && last.line === line) {
      last.to = station;
      last.stations.push(station);
      last.stops += 1;
    } else {
      legs.push({ line: line!, from: path[i - 1].station, to: station, next: station, stations: [path[i - 1].station, station], stops: 1 });
    }
  }
  return { legs, stops: legs.reduce((n, leg) => n + leg.stops, 0), transfers: legs.length - 1 };
}

// 경로 구간의 방면 (표지판처럼 "○○ 방면"). 그 두 역을 차례로 지나는 운행 계통의 실제 종착역을 모은다(자주 다니는 순).
// 2호선 순환 구간은 내선(시계 방향)·외선(반시계 방향)으로 알린다. 계통 자료가 없으면 노선 끝까지 따라가 끝역을 찾는다
export type LegDirection = { kind: "toward"; names: string[] } | { kind: "loop"; clockwise: boolean };
const lineAdjacent = new Map<string, Map<string, string[]>>();
for (const line of SUBWAY.lines) {
  const adj = new Map<string, string[]>();
  for (const [a, b] of line.edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  lineAdjacent.set(line.id, adj);
}
// 2호선 고리(지선을 깎아 낸 나머지)
const LOOP = (() => {
  const adj = new Map([...(lineAdjacent.get("L2") ?? new Map())].map(([k, v]) => [k, new Set(v as string[])]));
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const [id, set] of adj)
      if (set.size <= 1) {
        for (const other of set) adj.get(other)?.delete(id);
        adj.delete(id);
        pruned = true;
      }
  }
  return new Set(adj.keys());
})();
export function legDirection(line: string, from: string, next: string): LegDirection {
  if (line === "L2" && LOOP.has(from) && LOOP.has(next)) {
    // 고리 가운데를 기준으로 도는 방향 (북쪽이 위인 지도에서 각이 줄면 시계 방향)
    const ring = [...LOOP].map((id) => stationById.get(id)!);
    const cx = ring.reduce((n, s) => n + s.lon, 0) / ring.length;
    const cy = ring.reduce((n, s) => n + s.lat, 0) / ring.length;
    const angle = (s: SubwayStation) => Math.atan2(s.lat - cy, (s.lon - cx) * LON_SCALE);
    let d = angle(stationById.get(next)!) - angle(stationById.get(from)!);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return { kind: "loop", clockwise: d < 0 };
  }
  const counts = new Map<string, number>();
  for (const service of SUBWAY.services ?? []) {
    if (service.line !== line || /순환/.test(service.to)) continue;
    const i = service.stops.indexOf(from);
    if (i >= 0 && service.stops[i + 1] === next) counts.set(service.to, (counts.get(service.to) ?? 0) + 1);
  }
  if (counts.size) return { kind: "toward", names: [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 3) };
  const adj = lineAdjacent.get(line);
  if (!adj) return { kind: "toward", names: [] };
  const ends: string[] = [];
  const seen = new Set([from]);
  const stack = [next];
  while (stack.length) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const onward = (adj.get(current) ?? []).filter((n) => !seen.has(n));
    if (onward.length === 0) ends.push(current);
    else stack.push(...onward);
  }
  return { kind: "toward", names: ends.map((id) => stationById.get(id)!.ko) };
}

// 지하철 지도 화면의 범위 (남, 서, 북, 동). 역 자료(SUBWAY.bbox)보다 넓게 잡아, 축소해도 배경 지도가 끊겨 보이지 않게 한다.
// scripts/transit/fetch-map.ts가 이 범위로 배경 자료를 받는다
export const MAP_BBOX = [37.25, 126.3, 37.9, 127.4] as const;

// 화면 좌표: 경도·위도를 평면으로 옮긴다 (위도 37.5°에서 경도 1°가 위도 1°보다 짧은 만큼 줄인다)
const LON_SCALE = Math.cos((37.5 * Math.PI) / 180);
const MAP_SCALE = 4000;
export function project(lat: number, lon: number): { x: number; y: number } {
  const [south, west, north] = SUBWAY.bbox;
  void south;
  return { x: (lon - west) * LON_SCALE * MAP_SCALE, y: (north - lat) * MAP_SCALE };
}

// 지원 범위: 이 데이터가 담은 수도권 영역 안인지
export function inSupportedArea(lat: number, lon: number): boolean {
  const [south, west, north, east] = SUBWAY.bbox;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

// 점들을 모두 지나는 부드러운 곡선 (Catmull-Rom → 3차 베지어). 역 위치를 그대로 지난다
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M${p(0).x.toFixed(1)},${p(0).y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
