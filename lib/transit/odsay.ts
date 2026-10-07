// ODsay 대중교통 API 어댑터 (지하철 경로 검색 · 지하철역 시간표). 버스는 다루지 않는다.
// 엔드포인트·파라미터·출력 필드는 공식 레퍼런스(https://lab.odsay.com/guide/releaseReference?platform=web, 2026-10-04 확인)를 따랐다.
// 기본은 서버 플랫폼 키. WEB 호출자는 브라우저용 키만 담은 env를 넘긴다. 서버 키를 브라우저로 보내지 않는다.
// 상태: 미설정 / 권한 거부(키·등록 IP) / 하루 한도 / 시간 초과 / 오류 / 빈 결과 / 지역 밖 / 700m 이내. 성공한 결과만 잠시 캐시한다(실패는 캐시하지 않음).
// 여기서 쓰는 경로 검색(searchPubTransPathT)에는 출발 시각 파라미터가 없다: 결과는 "지금 기준" 일반 경로다.
// 시각 지정 조회는 scheduled.ts의 subwayPathSchedule 경로를 사용한다.

const BASE = "https://api.odsay.com/v1/api";
const TIMEOUT_MS = 10_000;
const CACHE_MS = 10 * 60_000;

export type OdsayStatus = "ok" | "empty" | "too_close" | "unconfigured" | "permission" | "limit" | "timeout" | "error" | "out_of_area";
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


type Fetch = typeof fetch;
type Options = { env?: Record<string, string | undefined>; fetch?: Fetch; now?: () => Date; cacheMs?: number };

const cache = new Map<string, { at: number; value: OdsayResult<unknown> }>();
const pending = new Map<string, Promise<OdsayResult<unknown>>>();
export const clearOdsayCache = () => cache.clear();

// 결과 언어: 영문(1)·일문(2)·중문 간체(3)·번체(4)·베트남어(5, 수도권만). 그 밖의 언어는 영문으로 받는다.
// 다국어는 유료 서비스에서만 된다(무료는 국문만, 공식 가이드 2026-10-04 확인). ODSAY_MULTILANG=1일 때만 lang을 보낸다
const LANG: Record<string, number> = { ko: 0, en: 1, ja: 2, "zh-CN": 3, vi: 5 };
const langParam = (language: string, env: Record<string, string | undefined> = process.env): Record<string, number> =>
  env.ODSAY_MULTILANG === "1" ? { lang: LANG[language] ?? 1 } : {};

export async function callOdsay<T>(
  path: string,
  params: Record<string, string | number>,
  parse: (result: Record<string, unknown>) => T | null,
  { env = process.env, fetch: fetcher = fetch, now = () => new Date(), cacheMs = CACHE_MS }: Options,
): Promise<OdsayResult<T>> {
  const apiKey = env.ODSAY_API_KEY?.trim();
  if (!apiKey) return { status: "unconfigured" };
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  // 키가 바뀌면 이전 키의 성공 결과를 재사용하지 않는다. 이 식별자는 메모리에서만 사용하고 출력하지 않는다.
  const cacheKey = `${apiKey}:${path}?${query}`;
  const hit = cache.get(cacheKey);
  if (hit && now().getTime() - hit.at < cacheMs) return { ...(hit.value as OdsayResult<T>), cached: true };
  const ongoing = pending.get(cacheKey);
  if (ongoing) return ongoing as Promise<OdsayResult<T>>;

  // 같은 화면의 중복 effect가 한도(기본 30회/일)를 두 번 쓰지 않도록 진행 중인 요청도 공유한다.
  const request = (async (): Promise<OdsayResult<T>> => {

  // 키에 특수문자(+, / 등)가 있을 수 있어 인코딩해 보낸다. 이미 인코딩된 키(%2B 등)를 넣었으면 한 번 풀어서 이중 인코딩을 막는다
  let body: Record<string, unknown>;
  try {
    query.set("apiKey", apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey);
    const res = await fetcher(`${BASE}/${path}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return { status: "permission" };
    if (res.status === 429) return { status: "limit", code: "429" };
    if (!res.ok) return { status: "error", code: String(res.status) };
    const parsed: unknown = await res.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: "error", code: "invalid_response" };
    body = parsed as Record<string, unknown>;
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
    // 하루 호출 한도 초과는 코드 429 + "Daily quota exceeded"로 온다 (2026-10-04 실제 응답 확인)
    if (code === "429" || /quota/i.test(String(first?.message ?? ""))) return { status: "limit", code: "429" };
    if (code === "-99" || code === "3" || code === "4" || code === "5") return { status: "empty", code };
    if (code === "-98") return { status: "too_close", code }; // 출발·도착이 700m 이내
    if (code === "6") return { status: "out_of_area", code };
    // 키 오류의 코드는 문서에 없다: 그 밖의 코드는 모두 오류로 보고 코드만 남긴다
    return { status: "error", code };
  }
  let data: T | null;
  try {
    data = parse((body.result ?? {}) as Record<string, unknown>);
  } catch {
    return { status: "error", code: "invalid_response" };
  }
  const value: OdsayResult<T> = data ? { status: "ok", data, fetchedAt: now().toISOString() } : { status: "empty" };
  if (value.status === "ok") cache.set(cacheKey, { at: now().getTime(), value });
  return value;
  })();
  pending.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pending.delete(cacheKey); // 실패를 캐시하지 않는다. 설정 수정 뒤 새 사용자 조회는 가능하다.
  }
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
  return callOdsay(
    "searchPubTransPathT",
    // SearchPathType 1 = 지하철만 (버스·버스+지하철 경로는 받지 않는다)
    { SX: from.lon, SY: from.lat, EX: to.lon, EY: to.lat, SearchPathType: 1, ...langParam(language, options.env) },
    (result) => {
      const paths = list(result.path).filter((path) => {
        const info = path.info as Record<string, unknown> | undefined;
        // 누락·null·비수치 요금을 0원으로 바꾸지 않는다. 유효한 결과만 화면에 전달한다.
        return info && typeof info.totalTime === "number" && Number.isFinite(info.totalTime) && info.totalTime > 0 &&
          typeof info.payment === "number" && Number.isFinite(info.payment) && info.payment >= 0;
      }).slice(0, 3).map((path): TransitPath => {
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
      if (list(result.path).length && !paths.length) throw new Error("invalid_transit_path");
      return paths.length ? paths : null;
    },
    options,
  );
}

// 지하철역 시간표 (searchSubwaySchedule, 2024-05 새 형식). 평일·토요일·휴일 시간표를 따로 준다
export type DayType = "weekday" | "saturday" | "holiday";
export type SubwayDeparture = { time: string; lastFlag: boolean; express: boolean; to: string };
export type SubwaySchedule = Record<DayType, { up: SubwayDeparture[]; down: SubwayDeparture[] }>;

export function subwaySchedule(stationID: number, wayCode: number | undefined, options: Options = {}): Promise<OdsayResult<SubwaySchedule>> {
  return callOdsay(
    "searchSubwaySchedule",
    { stationID, ...(wayCode ? { wayCode } : {}) },
    (result) => {
      const side = (block: unknown, key: "up" | "down") =>
        list((block as Record<string, unknown> | undefined)?.[key]).map((d) => ({
          time: str(d.departureTime),
          lastFlag: num(d.firstLastFlag) === 2 || num(d.firstLastFlag) === 3,
          express: d.subwayClass !== 0 && d.subwayClass !== "0", // 누락·알 수 없는 타입도 정차역 미확인으로 제외
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
