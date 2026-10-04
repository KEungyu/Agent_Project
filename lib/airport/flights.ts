// 인천공항 여객편 운항 현황 (공공데이터포털 "인천국제공항공사_여객편 운항현황(다국어)", 2026-10-04 확인).
// https://www.data.go.kr/data/15095093/openapi.do — 자동 승인, 개발 계정 하루 1,000건, 조회 당일 자료만 준다.
// 키(DATA_GO_KR_SERVICE_KEY)는 .env에서만 읽고 결과·오류에 담지 않는다. 키가 없으면 호출하지 않는다.
// 김포(한국공항공사) 실시간 운항 API는 안내 페이지를 확인하지 못해 연결하지 않았다.

import { kstDate } from "../time";

const BASE = "https://apis.data.go.kr/B551177/StatusOfPassengerFlightsOdp";
const TIMEOUT_MS = 10_000;
const CACHE_MS = 2 * 60_000; // 실시간 자료라 짧게만 담아 둔다

export type FlightStatusState = "ok" | "empty" | "not_today" | "unconfigured" | "permission" | "timeout" | "error";
export type FlightStatus = {
  flightId: string;
  scheduled: string; // HH:MM (KST)
  estimated?: string;
  gate?: string;
  carousel?: string;
  exit?: string;
  remark?: string;
  terminal?: "T1" | "T1 Concourse" | "T2";
  operatedBy?: string; // 공동운항이면 실제 운항편
};
export type FlightStatusResult = { status: FlightStatusState; data?: FlightStatus[]; fetchedAt?: string; code?: string };

// 응답의 terminalId 뜻 (공식 안내): P01 제1터미널 · P02 탑승동 · P03 제2터미널
const TERMINAL: Record<string, FlightStatus["terminal"]> = { P01: "T1", P02: "T1 Concourse", P03: "T2" };
const LANG: Record<string, string> = { ko: "K", ja: "J", "zh-CN": "C", "zh-TW": "C" };

type Options = { env?: Record<string, string | undefined>; fetch?: typeof fetch; now?: () => Date };
const cache = new Map<string, { at: number; value: FlightStatusResult }>();
export const clearFlightCache = () => cache.clear();

// "0825" 또는 "202610090825" → "08:25"
const hhmm = (value: unknown) => {
  const text = String(value ?? "").replace(/\D/g, "");
  return text.length >= 4 ? `${text.slice(-4, -2)}:${text.slice(-2)}` : undefined;
};
const clean = (value: unknown) => {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text ? text : undefined;
};

export async function icnFlightStatus(
  direction: "arrival" | "departure",
  flightNo: string,
  flightDateTime: string, // 보드의 항공편 일시 (ISO). 운항 당일에만 조회한다
  language: string,
  { env = process.env, fetch: fetcher = fetch, now = () => new Date() }: Options = {},
): Promise<FlightStatusResult> {
  const key = env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) return { status: "unconfigured" };
  if (kstDate(flightDateTime) !== kstDate(now().toISOString())) return { status: "not_today" };
  const flight = flightNo.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(flight)) return { status: "empty" };

  const cacheKey = `${direction}:${flight}:${language}`;
  const hit = cache.get(cacheKey);
  if (hit && now().getTime() - hit.at < CACHE_MS) return hit.value;

  const op = direction === "arrival" ? "getPassengerArrivalsOdp" : "getPassengerDeparturesOdp";
  const query = new URLSearchParams({ flight_id: flight, type: "json", lang: LANG[language] ?? "E" });
  let body: Record<string, unknown>;
  try {
    // 포털은 인코딩 키와 디코딩 키를 함께 준다. 이미 인코딩된 키(%가 있음)는 그대로, 아니면 한 번만 인코딩한다
    const serviceKey = key.includes("%") ? key : encodeURIComponent(key);
    const res = await fetcher(`${BASE}/${op}?serviceKey=${serviceKey}&${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403) return { status: "permission", code: String(res.status) };
    if (!res.ok) return { status: "error", code: String(res.status) };
    body = (await res.json()) as Record<string, unknown>;
  } catch (error) {
    return { status: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "error" };
  }

  // 인증 오류는 OpenAPI_ServiceResponse로 온다 (returnReasonCode 30 = 등록되지 않은 키)
  const gateway = (body.OpenAPI_ServiceResponse as { cmmMsgHeader?: { returnReasonCode?: unknown } } | undefined)?.cmmMsgHeader;
  if (gateway) return { status: ["20", "30", "31", "32"].includes(String(gateway.returnReasonCode)) ? "permission" : "error", code: String(gateway.returnReasonCode ?? "") };

  const response = (body.response ?? {}) as { header?: { resultCode?: unknown }; body?: { items?: unknown } };
  const resultCode = String(response.header?.resultCode ?? "");
  if (resultCode && resultCode !== "00") return { status: resultCode === "03" ? "empty" : "error", code: resultCode };
  const rawItems = response.body?.items;
  const items = (Array.isArray(rawItems) ? rawItems : Array.isArray((rawItems as { item?: unknown })?.item) ? (rawItems as { item: unknown[] }).item : rawItems && typeof rawItems === "object" && "item" in rawItems ? [(rawItems as { item: unknown }).item] : []) as Record<string, unknown>[];

  const data = items
    .filter((item) => String(item.flightId ?? "").toUpperCase() === flight)
    .map((item) => {
      const master = clean(item.masterflightid ?? item.masterFlightId);
      return {
        flightId: String(item.flightId),
        scheduled: hhmm(item.scheduleDateTime) ?? "",
        estimated: hhmm(item.estimatedDateTime),
        gate: clean(item.gatenumber),
        carousel: clean(item.carousel),
        exit: clean(item.exitnumber),
        remark: clean(item.remark),
        terminal: TERMINAL[String(item.terminalId ?? item.terminalid ?? "")],
        operatedBy: master && master.toUpperCase() !== flight ? master : undefined,
      };
    });
  const value: FlightStatusResult = data.length ? { status: "ok", data, fetchedAt: now().toISOString() } : { status: "empty" };
  if (value.status === "ok") cache.set(cacheKey, { at: now().getTime(), value });
  return value;
}
