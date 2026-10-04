// Booking.com Demand API 어댑터 (선택 버전: 3.2). 서버에서만 쓴다.
// 3.2는 예약 이동 주소가 url.web / url.app 객체다(3.1의 url / deep_link_url과 섞지 않는다).
// 자격(API 키 토큰·Affiliate ID)이 없으면 꺼져 있고, 화면은 공식 웹 연결로 대신한다.
// 참고(2026-10-04 확인): https://developers.booking.com/demand/docs/migration-guide/v3.2/accommodations/intro
//                        https://developers.booking.com/demand/docs/getting-started/sandbox

import { safeExternalUrl } from "../external/links";
import type { StayBookingCriteria } from "./criteria";

export const DEMAND_API_VERSION = "3.2";
const BASE = {
  // 문서에서 확인한 Sandbox 주소
  sandbox: "https://demandapi-sandbox.booking.com/3.2",
  // 운영 주소는 Sandbox 형식에서 추정한 값이다 — 계약 시 반드시 다시 확인한다. 운영은 따로 허용해야만 쓴다
  production: "https://demandapi.booking.com/3.2",
} as const;
const TIMEOUT_MS = 10_000;

export type DemandConfig =
  | { ok: true; env: "sandbox" | "production"; base: string; token: string; affiliateId: string }
  | { ok: false; missing: string[] };

// 키 값은 돌려주지 않는 곳(로그·화면)에서는 missing의 이름만 쓴다
export function demandConfig(env: Record<string, string | undefined> = process.env): DemandConfig {
  const missing = ["BOOKING_DEMAND_TOKEN", "BOOKING_AFFILIATE_ID"].filter((key) => !env[key]);
  const target = env.BOOKING_DEMAND_ENV === "production" ? "production" : "sandbox";
  if (target === "production" && env.BOOKING_DEMAND_ALLOW_PRODUCTION !== "1") missing.push("BOOKING_DEMAND_ALLOW_PRODUCTION=1");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, env: target, base: BASE[target], token: env.BOOKING_DEMAND_TOKEN!, affiliateId: env.BOOKING_AFFILIATE_ID! };
}

export type DemandOffer = {
  accommodationId: string;
  name?: string;
  price?: { amount: number; currency: string };
  url: string; // 검증한 https://www.booking.com/ 주소 (3.2 url.web)
};

export type DemandResult =
  | { status: "ok"; offers: DemandOffer[]; checkedAt: string; criteria: StayBookingCriteria; version: string }
  | { status: "empty"; checkedAt: string; criteria: StayBookingCriteria }
  | { status: "permission" | "timeout" | "error" | "unconfigured"; detail: string };

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

// 3.2 응답에서 숙소 하나를 꺼낸다. url이 문자열(3.1 형식)이면 쓰지 않는다.
// url.web은 마이그레이션 문서로 확인했지만 price·currency 필드 이름은 문서로 확인하지 못한 가정이다 (Sandbox 검증 필요)
function toOffer(item: Record<string, unknown>): DemandOffer | null {
  const url = item.url as { web?: unknown } | string | undefined;
  const web = typeof url === "object" && url && typeof url.web === "string" ? safeExternalUrl(url.web, "booking") : null;
  if (!web || (typeof item.id !== "string" && typeof item.id !== "number")) return null;
  const price = item.price as { book?: number; total?: number } | undefined;
  const currency = typeof item.currency === "string" ? item.currency : undefined;
  const amount = price?.book ?? price?.total;
  return {
    accommodationId: String(item.id),
    name: typeof item.name === "string" ? item.name : undefined,
    price: typeof amount === "number" && currency ? { amount, currency } : undefined,
    url: web,
  };
}

// 숙소 ID 목록에 대해 날짜·인원 조건의 예약 가능 여부와 공식 이동 주소를 조회한다 (POST /accommodations/availability).
// bookerCountry: 이용자가 알려 준 거주 국가(소문자 ISO-2). 여행지가 한국이라고 추정하지 않는다.
export async function searchAvailability(
  criteria: StayBookingCriteria,
  accommodationIds: string[],
  bookerCountry: string,
  options: { config?: DemandConfig; fetch?: Fetch; now?: () => Date } = {},
): Promise<DemandResult> {
  const config = options.config ?? demandConfig();
  if (!config.ok) return { status: "unconfigured", detail: `missing: ${config.missing.join(", ")}` };
  const doFetch = options.fetch ?? fetch;
  const body = {
    accommodations: accommodationIds,
    booker: { country: bookerCountry.toLowerCase(), platform: "desktop" },
    checkin: criteria.check_in,
    checkout: criteria.check_out,
    guests: {
      number_of_adults: criteria.adults,
      number_of_rooms: criteria.rooms,
      ...(criteria.children_ages?.length ? { children: criteria.children_ages } : {}),
    },
    extras: ["extra_charges"],
  };
  let response: Response;
  try {
    response = await doFetch(`${config.base}/accommodations/availability`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "X-Affiliate-Id": config.affiliateId, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const name = (error as Error)?.name;
    return { status: name === "TimeoutError" || name === "AbortError" ? "timeout" : "error", detail: String((error as Error)?.message ?? error).slice(0, 120) };
  }
  if (response.status === 401 || response.status === 403) return { status: "permission", detail: `HTTP ${response.status}` };
  if (!response.ok) return { status: "error", detail: `HTTP ${response.status}` };
  const data = (await response.json().catch(() => null)) as { data?: Record<string, unknown>[] } | null;
  const offers = (data?.data ?? []).map(toOffer).filter((offer): offer is DemandOffer => offer !== null);
  const checkedAt = (options.now?.() ?? new Date()).toISOString();
  if (offers.length === 0) return { status: "empty", checkedAt, criteria };
  return { status: "ok", offers, checkedAt, criteria, version: DEMAND_API_VERSION };
}

// 조건이 바뀌면 이전 결과를 쓰지 않는다: 결과에 담긴 조건과 지금 조건이 같아야 한다
export function resultMatches(result: DemandResult, criteria: StayBookingCriteria): boolean {
  if (result.status !== "ok" && result.status !== "empty") return false;
  const a = result.criteria;
  return (
    a.destination === criteria.destination &&
    a.check_in === criteria.check_in &&
    a.check_out === criteria.check_out &&
    a.adults === criteria.adults &&
    a.rooms === criteria.rooms &&
    JSON.stringify(a.children_ages ?? []) === JSON.stringify(criteria.children_ages ?? [])
  );
}
