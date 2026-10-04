// ODsay 대중교통 API 어댑터 (경로 검색 · 버스 노선 검색 · 버스 노선 정류장 순서).
// 엔드포인트·파라미터·출력 필드는 공식 레퍼런스(https://lab.odsay.com/guide/releaseReference?platform=web, 2026-10-04 확인)를 따랐다.
// 팀에 발급된 키가 없어 실제 호출 결과는 확인하지 못했다(미완료). 키가 없으면 호출하지 않고 "unconfigured"를 돌려준다.
// 경로 검색에는 출발 날짜·시각 파라미터가 없다: 결과는 현재 기준 일반 경로이며, 특정 시각의 운행·막차·환승 가능을 보장하지 않는다.

const BASE = "https://api.odsay.com/v1/api";
const TIMEOUT_MS = 10_000;
const CACHE_MS = 10 * 60_000;

export type OdsayStatus = "ok" | "empty" | "too_close" | "unconfigured" | "permission" | "timeout" | "error" | "out_of_area";
export type OdsayResult<T> = { status: OdsayStatus; data?: T; fetchedAt?: string; cached?: boolean; code?: string };

export type TransitLeg =
  | { kind: "walk"; meters: number; minutes: number }
  | {
      kind: "subway" | "bus";
      name: string; // 지하철 노선명 또는 버스 번호
      from: string;
      to: string;
      way?: string; // 지하철 방면
      stops: number;
      minutes: number;
      stations: string[];
      exitIn?: string;
      exitOut?: string;
      stationID?: number; // 승차역 코드 (지하철 시간표 조회용)
      wayCode?: number; // 1 상행 · 2 하행
    };
export type TransitPath = { minutes: number; fare: number; transfers: number; walkMeters: number; legs: TransitLeg[] };

export type BusLane = { busID: number; busNo: string; from: string; to: string; city: string; first?: string; last?: string };
export type BusStop = { idx: number; name: string; arsID: string; direction: number; x: number; y: number; nonstop: boolean };
export type BusLaneDetail = { busID: number; busNo: string; from: string; to: string; turningPointIdx?: number; stops: BusStop[] };

type Fetch = typeof fetch;
type Options = { env?: Record<string, string | undefined>; fetch?: Fetch; now?: () => Date; cacheMs?: number };

const cache = new Map<string, { at: number; value: OdsayResult<unknown> }>();
export const clearOdsayCache = () => cache.clear();

// 결과 언어: 영문(1)·일문(2)·중문 간체(3)·번체(4)·베트남어(5, 수도권만). 그 밖의 언어는 영문으로 받는다.
// 다국어는 유료 서비스에서만 된다(무료는 국문만, 공식 가이드 2026-10-04 확인). ODSAY_MULTILANG=1일 때만 lang을 보낸다
const LANG: Record<string, number> = { ko: 0, en: 1, ja: 2, "zh-CN": 3, "zh-TW": 4, vi: 5 };
const langParam = (language: string, env: Record<string, string | undefined> = process.env): Record<string, number> =>
  env.ODSAY_MULTILANG === "1" ? { lang: LANG[language] ?? 1 } : {};

async function call<T>(
  path: string,
  params: Record<string, string | number>,
  parse: (result: Record<string, unknown>) => T | null,
  { env = process.env, fetch: fetcher = fetch, now = () => new Date(), cacheMs = CACHE_MS }: Options,
): Promise<OdsayResult<T>> {
  const apiKey = env.ODSAY_API_KEY?.trim();
  if (!apiKey) return { status: "unconfigured" };
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const cacheKey = `${path}?${query}`;
  const hit = cache.get(cacheKey);
  if (hit && now().getTime() - hit.at < cacheMs) return { ...(hit.value as OdsayResult<T>), cached: true };

  // 키에 특수문자(+, / 등)가 있을 수 있어 인코딩해 보낸다. 이미 인코딩된 키(%2B 등)를 넣었으면 한 번 풀어서 이중 인코딩을 막는다
  query.set("apiKey", apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey);
  let body: Record<string, unknown>;
  try {
    const res = await fetcher(`${BASE}/${path}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return { status: "permission" };
    if (!res.ok) return { status: "error", code: String(res.status) };
    body = (await res.json()) as Record<string, unknown>;
  } catch (error) {
    return { status: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "error" };
  }

  // 오류 형식은 문서에 코드 목록만 있고 감싸는 구조가 없어 두 형태를 모두 받는다 (실제 응답 미확인)
  const rawError = body.error as { code?: unknown; message?: unknown }[] | { code?: unknown; message?: unknown } | undefined;
  if (rawError) {
    const first = Array.isArray(rawError) ? rawError[0] : rawError;
    const code = String(first?.code ?? "");
    // 키 인증 실패는 코드 500과 함께 "[ApiKeyAuthFailed]"로 온다 (2026-10-04 실제 응답 확인): 플랫폼(서버)·등록 IP 문제
    if (/ApiKeyAuthFailed/i.test(String(first?.message ?? ""))) return { status: "permission", code: "ApiKeyAuthFailed" };
    if (code === "-99" || code === "3" || code === "4" || code === "5") return { status: "empty", code };
    if (code === "-98") return { status: "too_close", code }; // 출발·도착이 700m 이내
    if (code === "6") return { status: "out_of_area", code };
    // 키 오류의 코드는 문서에 없다: 그 밖의 코드는 모두 오류로 보고 코드만 남긴다
    return { status: "error", code };
  }
  const data = parse((body.result ?? {}) as Record<string, unknown>);
  const value: OdsayResult<T> = data ? { status: "ok", data, fetchedAt: now().toISOString() } : { status: "empty" };
  if (value.status === "ok") cache.set(cacheKey, { at: now().getTime(), value });
  return value;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

// 좌표는 확인된 장소(노선도 데이터의 역 좌표 등)에서만 받는다. LLM이 만든 좌표를 넣지 않는다
export function searchTransitPaths(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  language: string,
  options: Options = {},
): Promise<OdsayResult<TransitPath[]>> {
  return call(
    "searchPubTransPathT",
    { SX: from.lon, SY: from.lat, EX: to.lon, EY: to.lat, ...langParam(language, options.env) },
    (result) => {
      const paths = list(result.path).slice(0, 3).map((path): TransitPath => {
        const info = (path.info ?? {}) as Record<string, unknown>;
        return {
          minutes: num(info.totalTime),
          fare: num(info.payment),
          transfers: num(info.busTransitCount) + num(info.subwayTransitCount) - 1,
          walkMeters: num(info.totalWalk),
          legs: list(path.subPath).map((sub): TransitLeg => {
            const type = num(sub.trafficType);
            if (type === 3) return { kind: "walk", meters: num(sub.distance), minutes: num(sub.sectionTime) };
            const lane = list(sub.lane)[0] ?? {};
            const stations = list((sub.passStopList as Record<string, unknown> | undefined)?.stations).map((s) => str(s.stationName));
            return {
              kind: type === 1 ? "subway" : "bus",
              name: str(type === 1 ? lane.name : lane.busNo),
              from: str(sub.startName),
              to: str(sub.endName),
              way: sub.way ? str(sub.way) : undefined,
              stops: num(sub.stationCount),
              minutes: num(sub.sectionTime),
              stations,
              exitIn: sub.startExitNo ? str(sub.startExitNo) : undefined,
              exitOut: sub.endExitNo ? str(sub.endExitNo) : undefined,
              stationID: sub.startID ? num(sub.startID) : undefined,
              wayCode: sub.wayCode ? num(sub.wayCode) : undefined,
            };
          }),
        };
      });
      return paths.length ? paths : null;
    },
    options,
  );
}

// 버스 번호로 노선 찾기 (CID 1000 = 서울). 같은 번호가 여러 도시에 있으면 모두 돌려주고 이용자가 고른다
export function searchBusLanes(busNo: string, language: string, options: Options = {}): Promise<OdsayResult<BusLane[]>> {
  return call(
    "searchBusLane",
    { busNo: busNo.trim(), ...langParam(language, options.env), displayCnt: 10 },
    (result) => {
      const lanes = list(result.lane).map((lane) => ({
        busID: num(lane.busID),
        busNo: str(lane.busNo),
        from: str(lane.busStartPoint),
        to: str(lane.busEndPoint),
        city: str(lane.busCityName),
        first: lane.busFirstTime ? str(lane.busFirstTime) : undefined,
        last: lane.busLastTime ? str(lane.busLastTime) : undefined,
      }));
      return lanes.length ? lanes : null;
    },
    options,
  );
}

// 노선의 정류장 순서. stationDirection(1 하행·2 상행)과 arsID(정류장 고유번호)로 같은 이름의 반대편 정류장을 구분한다
export function busLaneDetail(busID: number, language: string, options: Options = {}): Promise<OdsayResult<BusLaneDetail>> {
  return call(
    "busLaneDetail",
    { busID, ...langParam(language, options.env) },
    (result) => {
      const stops = list(result.station).map((s) => ({
        idx: num(s.idx),
        name: str(s.stationName),
        arsID: str(s.arsID),
        direction: num(s.stationDirection),
        x: num(s.x),
        y: num(s.y),
        nonstop: num(s.nonstopStation) === 1,
      }));
      if (!stops.length) return null;
      return {
        busID: num(result.busID),
        busNo: str(result.busNo),
        from: str(result.busStartPoint),
        to: str(result.busEndPoint),
        turningPointIdx: result.turningPointIdx === undefined ? undefined : num(result.turningPointIdx),
        stops: stops.sort((a, b) => a.idx - b.idx),
      };
    },
    options,
  );
}

// 승차 정류장에서 하차 정류장까지 같은 진행 방향으로 갈 수 있는지. 회차점을 지나야 하면 그 사실을 알려 준다
export function busRide(detail: BusLaneDetail, boardIdx: number, alightIdx: number): { ok: boolean; passesTurn: boolean; stops: number } {
  const board = detail.stops.findIndex((s) => s.idx === boardIdx);
  const alight = detail.stops.findIndex((s) => s.idx === alightIdx);
  if (board < 0 || alight < 0 || alight <= board) return { ok: false, passesTurn: false, stops: 0 };
  const turn = detail.turningPointIdx;
  const passesTurn = turn !== undefined && boardIdx < turn && alightIdx > turn;
  return { ok: true, passesTurn, stops: alight - board };
}

// 지하철역 시간표 (searchSubwaySchedule, 2024-05 새 형식). 평일·토요일·휴일 시간표를 따로 준다
export type DayType = "weekday" | "saturday" | "holiday";
export type SubwayDeparture = { time: string; lastFlag: boolean; express: boolean; to: string };
export type SubwaySchedule = Record<DayType, { up: SubwayDeparture[]; down: SubwayDeparture[] }>;

export function subwaySchedule(stationID: number, wayCode: number | undefined, options: Options = {}): Promise<OdsayResult<SubwaySchedule>> {
  return call(
    "searchSubwaySchedule",
    { stationID, ...(wayCode ? { wayCode } : {}) },
    (result) => {
      const side = (block: unknown, key: "up" | "down") =>
        list((block as Record<string, unknown> | undefined)?.[key]).map((d) => ({
          time: str(d.departureTime),
          lastFlag: num(d.firstLastFlag) === 2 || num(d.firstLastFlag) === 3,
          express: num(d.subwayClass) > 0,
          to: str(d.endStationName),
        }));
      const day = (key: string) => ({ up: side(result[key], "up"), down: side(result[key], "down") });
      const schedule = { weekday: day("weekdaySchedule"), saturday: day("saturdaySchedule"), holiday: day("holidaySchedule") };
      const any = Object.values(schedule).some((d) => d.up.length || d.down.length);
      return any ? schedule : null;
    },
    { ...options, cacheMs: 6 * 3_600_000 },
  );
}
