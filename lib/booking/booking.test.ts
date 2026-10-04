import { describe, expect, it } from "vitest";
import { checkStayCriteria, type StayBookingCriteria } from "./criteria";
import { demandConfig, resultMatches, searchAvailability } from "./demand";
import { DirectBooking, DirectBookingError, mockProvider, quoteIsApprovable, type Quote } from "./direct";

const criteria: StayBookingCriteria = { destination: "Busan", check_in: "2026-10-12", check_out: "2026-10-14", adults: 2, rooms: 1 };
const TODAY = "2026-10-04";

describe("새 숙소 예약 조건 (B01·B03)", () => {
  it("올바른 조건은 통과하고, 예약번호는 요구하지 않는다", () => {
    expect(checkStayCriteria(criteria, TODAY)).toEqual([]);
  });
  it("체크아웃이 체크인보다 이르거나 같음, 인원 부족, 지난 날짜, 객실이 인원보다 많음을 잡는다", () => {
    expect(checkStayCriteria({ ...criteria, check_out: "2026-10-11" }, TODAY)).toContain("dates_order");
    expect(checkStayCriteria({ ...criteria, adults: 0 }, TODAY)).toContain("adults");
    expect(checkStayCriteria({ ...criteria, check_in: "2026-10-01" }, TODAY)).toContain("past_check_in");
    expect(checkStayCriteria({ ...criteria, rooms: 3 }, TODAY)).toContain("rooms_over_guests");
    expect(checkStayCriteria({ ...criteria, check_in: "next friday" }, TODAY)).toContain("date_format");
  });
});

describe("Booking.com Demand API 3.2 어댑터 (모의 응답, B04~B06)", () => {
  const config = { ok: true as const, env: "sandbox" as const, base: "https://demandapi-sandbox.booking.com/3.2", token: "t", affiliateId: "a" };
  const respond = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

  it("자격이 없으면 꺼져 있고, 빠진 항목의 이름만 알려 준다 (B04)", async () => {
    expect(demandConfig({})).toEqual({ ok: false, missing: ["BOOKING_DEMAND_TOKEN", "BOOKING_AFFILIATE_ID"] });
    expect(demandConfig({ BOOKING_DEMAND_TOKEN: "x", BOOKING_AFFILIATE_ID: "y", BOOKING_DEMAND_ENV: "production" })).toMatchObject({ ok: false });
    expect((await searchAvailability(criteria, ["1"], "gb", { config: demandConfig({}) })).status).toBe("unconfigured");
  });

  it("성공·권한 오류·시간 초과·결과 없음을 구분한다 (B05)", async () => {
    const ok = await searchAvailability(criteria, ["10"], "gb", {
      config,
      fetch: respond(200, { data: [{ id: 10, name: "Sandbox Hotel", currency: "EUR", price: { book: 120 }, url: { web: "https://www.booking.com/hotel/x.html?aid=a", app: "booking://x" } }] }),
    });
    expect(ok).toMatchObject({ status: "ok", version: "3.2", offers: [{ accommodationId: "10", url: "https://www.booking.com/hotel/x.html?aid=a" }] });
    expect((await searchAvailability(criteria, ["10"], "gb", { config, fetch: respond(403, {}) })).status).toBe("permission");
    expect((await searchAvailability(criteria, ["10"], "gb", { config, fetch: respond(200, { data: [] }) })).status).toBe("empty");
    const timeout = async () => {
      throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    };
    expect((await searchAvailability(criteria, ["10"], "gb", { config, fetch: timeout })).status).toBe("timeout");
  });

  it("3.1 형식(url 문자열)이나 허용되지 않은 주소는 쓰지 않는다", async () => {
    const result = await searchAvailability(criteria, ["10"], "gb", {
      config,
      fetch: respond(200, { data: [{ id: 1, url: "https://www.booking.com/hotel/x.html" }, { id: 2, url: { web: "https://www.booking.com.evil.example/x" } }] }),
    });
    expect(result.status).toBe("empty");
  });

  it("날짜·인원이 바뀌면 이전 결과를 최신 조건의 결과로 보지 않는다 (B06)", async () => {
    const result = await searchAvailability(criteria, ["10"], "gb", {
      config,
      fetch: respond(200, { data: [{ id: 10, url: { web: "https://www.booking.com/hotel/x.html" } }] }),
    });
    expect(resultMatches(result, criteria)).toBe(true);
    expect(resultMatches(result, { ...criteria, adults: 3 })).toBe(false);
    expect(resultMatches(result, { ...criteria, check_out: "2026-10-15" })).toBe(false);
  });
});

describe("직접 예약 흐름 (모의 공급자, D01·D03·D04·D05)", () => {
  const now = () => new Date("2026-10-04T12:00:00+09:00");
  const quote: Quote = {
    provider: "mock",
    env: "mock",
    quoteId: "q1",
    version: "v1",
    target: { name: "Mock Hotel (fictional)" },
    when: { start: "2026-10-12", end: "2026-10-14" },
    party: { adults: 2, rooms: 1 },
    total: { amount: 240000, currency: "KRW" },
    taxesIncluded: true,
    cancellation: "Free cancellation until 2026-10-10 (mock)",
    deposit: null,
    expiresAt: "2026-10-04T13:00:00+09:00",
  };

  it("확정 금액이나 취소 조건을 모르면 승인받지 않는다 (D01)", () => {
    expect(quoteIsApprovable({ ...quote, total: null }, now())).toEqual({ ok: false, reason: "price_unconfirmed" });
    expect(quoteIsApprovable({ ...quote, expiresAt: "2026-10-04T11:00:00+09:00" }, now())).toEqual({ ok: false, reason: "expired" });
  });

  it("화면에서 본 버전과 다르면 예약하지 않는다 (D03)", async () => {
    const provider = mockProvider();
    await expect(new DirectBooking(provider, now).submit({ ...quote, version: "v2" }, "v1", "hotel:mock")).rejects.toMatchObject({ code: "stale_quote" });
    expect(provider.calls.create).toBe(0);
  });

  it("같은 버전을 두 번 보내도 공급자 요청은 한 번이다 (D04)", async () => {
    const provider = mockProvider();
    const booking = new DirectBooking(provider, now);
    const first = await booking.submit(quote, "v1", "hotel:mock");
    const second = await booking.submit(quote, "v1", "hotel:mock");
    expect(first.state).toBe("confirmed");
    expect(second).toBe(first);
    expect(provider.calls.create).toBe(1);
  });

  it("시간 초과로 결과를 모르면 '확인 중'으로 두고, 조회 전에는 다시 보내거나 다른 채널로 신청하지 않는다 (D05)", async () => {
    const provider = mockProvider({ create: "timeout", lookup: "unknown" });
    const booking = new DirectBooking(provider, now);
    const attempt = await booking.submit(quote, "v1", "hotel:mock");
    expect(attempt.state).toBe("unknown");
    await expect(booking.submit(quote, "v1", "hotel:mock")).rejects.toBeInstanceOf(DirectBookingError);
    expect(booking.openAttemptFor("hotel:mock")).toBe(attempt);
    expect(provider.calls.create).toBe(1);
    expect((await booking.reconcile(attempt.key)).state).toBe("unknown");
    expect(provider.calls.lookup).toBe(1);
  });
});
