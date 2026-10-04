import data from "../../data/transit/seoul-subway.json";

// 수도권 전철 노선도 데이터 (OpenStreetMap, ODbL 1.0 — scripts/transit/fetch-subway.ts로 받는다).
// 연결 관계·환승역만 담는다: 시간표·소요 시간·요금·급행 정차·출구·엘리베이터는 이 데이터에 없다.

export type SubwayLine = { id: string; ko: string; en: string; short: string; colour: string; edges: [string, string][] };
export type SubwayStation = { id: string; ko: string; en: string; lat: number; lon: number; lines: string[] };
export type SubwayData = {
  source: { name: string; license: string; url: string; via: string };
  fetchedAt: string;
  bbox: readonly number[];
  lines: SubwayLine[];
  stations: SubwayStation[];
};

export const SUBWAY = data as unknown as SubwayData;
const stationById = new Map(SUBWAY.stations.map((s) => [s.id, s]));
const lineById = new Map(SUBWAY.lines.map((l) => [l.id, l]));
export const getStation = (id: string) => stationById.get(id);
export const getLine = (id: string) => lineById.get(id);

// 역 이름 찾기: 한국어·영어 이름, "역"·"Station" 생략 허용. 같은 이름이 여럿이면 모두 돌려준다(동명역 구분)
const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s*station$/i, "")
    .replace(/역$/, "")
    .replace(/[\s'’.\-–]/g, "");
export function findStations(query: string, limit = 8): SubwayStation[] {
  const q = norm(query.trim());
  if (!q) return [];
  const exact = SUBWAY.stations.filter((s) => norm(s.ko) === q || norm(s.en) === q);
  if (exact.length) return exact;
  return SUBWAY.stations.filter((s) => norm(s.ko).includes(q) || norm(s.en).includes(q)).slice(0, limit);
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

// 화면 좌표: 경도·위도를 평면으로 옮긴다 (위도 37.5°에서 경도 1°가 위도 1°보다 짧은 만큼 줄인다)
const LON_SCALE = Math.cos((37.5 * Math.PI) / 180);
export const MAP_SCALE = 4000;
export function project(lat: number, lon: number): { x: number; y: number } {
  const [south, west, north] = SUBWAY.bbox;
  void south;
  return { x: (lon - west) * LON_SCALE * MAP_SCALE, y: (north - lat) * MAP_SCALE };
}
export function mapSize() {
  const [south, west, north, east] = SUBWAY.bbox;
  return { width: (east - west) * LON_SCALE * MAP_SCALE, height: (north - south) * MAP_SCALE };
}

// 지원 범위: 이 데이터가 담은 수도권 영역 안인지
export function inSupportedArea(lat: number, lon: number): boolean {
  const [south, west, north, east] = SUBWAY.bbox;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}
