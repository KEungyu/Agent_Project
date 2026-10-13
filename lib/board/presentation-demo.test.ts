import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConversation, setConversation } from "../agent/conversation";
import { openDb, type Db } from "../db/client";
import { createRequest, getHistory } from "../requests/state";
import { loadPresentationDemo, presentationDemoRecipient } from "./demo";
import { addStay, createBoard, getBoard, getCurrentBoard, listEvents, recordEvent } from "./store";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  vi.stubEnv("MAIL_MODE", "mock");
  vi.stubEnv("RESEND_API_KEY", undefined);
  vi.stubEnv("MAIL_FROM", undefined);
  vi.stubEnv("MAIL_ALLOWLIST", undefined);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-13T06:30:00Z"));
});

afterEach(() => {
  db.$client.close();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const boardCount = () => (db.$client.prepare("SELECT COUNT(*) AS count FROM trip_boards").get() as { count: number }).count;

describe("presentation demo loader", () => {
  it("loads only fictional starting data and preserves the old board, request, events and conversation", () => {
    const old = createBoard(db, { user_language: "ja" });
    const stay = addStay(db, old.id, { name: "Existing hotel", booking_ref: "KEEP-1" }, "user");
    const request = createRequest(db, { boardId: old.id, targetId: stay.id, typeId: "late_checkin", slots: { booking_ref: "KEEP-1" } }, "user");
    recordEvent(db, old.id, "user_action", { action: "existing_action" });
    setConversation(old.id, [{ role: "user", content: "Keep this previous conversation." }]);
    const before = getBoard(db, old.id);
    const eventsBefore = listEvents(db, old.id);
    const historyBefore = getHistory(db, request.id);
    const conversationBefore = structuredClone(getConversation(old.id));

    const fresh = loadPresentationDemo(db, old.id);

    expect(fresh.id).not.toBe(old.id);
    expect(getCurrentBoard(db)?.id).toBe(fresh.id);
    expect(boardCount()).toBe(2);
    expect(getBoard(db, old.id)).toEqual(before);
    expect(listEvents(db, old.id)).toEqual(eventsBefore);
    expect(getHistory(db, request.id)).toEqual(historyBefore);
    expect(getConversation(old.id)).toEqual(conversationBefore);
    expect(fresh.user_language).toBe("en");
    expect(fresh.arrival).toEqual({ datetime: "2026-10-19T22:30+09:00", airport: "ICN", terminal: "T2" });
    expect(fresh.departure).toEqual({ datetime: "2026-10-25T18:30+09:00", airport: "ICN" });
    expect(fresh.itinerary).toEqual([
      { date: "2026-10-19", city: "Seoul", transport: { status: "none" } },
      { date: "2026-10-22", city: "Gyeongju", transport: { status: "none" } },
      { date: "2026-10-23", city: "Busan", transport: { status: "none" } },
    ]);
    expect(fresh.stays).toHaveLength(1);
    expect(fresh.stays[0]).toMatchObject({
      name: "Majungi Demo Hotel (Fictional)",
      email: "front@majungi-demo.test",
      address_ko: "서울 중구 명동 (시연용 가상 숙소)",
      guest_name: "Emma Smith",
      booking_ref: "DEMO-20261019",
      check_in_date: "2026-10-19",
      check_out_date: "2026-10-22",
      expected_arrival: "2026-10-20T01:30+09:00",
    });
    expect(fresh.stays[0].phone).toBeUndefined();
    expect(fresh.requests).toEqual([]);
    expect(getConversation(fresh.id)).toEqual([]);
    expect(listEvents(db, fresh.id)).toEqual([expect.objectContaining({ kind: "user_action" })]);
  });

  it("uses the mock default when MAIL_MODE is unset and no board exists", () => {
    vi.stubEnv("MAIL_MODE", undefined);
    const fresh = loadPresentationDemo(db, null);
    expect(getCurrentBoard(db)?.id).toBe(fresh.id);
    expect(fresh.requests).toEqual([]);
    expect(boardCount()).toBe(1);
  });

  it.each(["real", "invalid", ""])("rejects MAIL_MODE=%s without changing the current board", (mode) => {
    const old = createBoard(db);
    vi.stubEnv("MAIL_MODE", mode);
    expect(() => loadPresentationDemo(db, old.id)).toThrow();
    expect(getCurrentBoard(db)).toEqual(old);
    expect(boardCount()).toBe(1);
    expect(listEvents(db, old.id)).toEqual([]);
  });

  it("uses the one configured test address in real mode without sending or changing the old board", () => {
    const old = createBoard(db);
    vi.stubEnv("MAIL_MODE", "real");
    vi.stubEnv("RESEND_API_KEY", "test-placeholder");
    vi.stubEnv("MAIL_FROM", "demo@example.com");
    vi.stubEnv("MAIL_ALLOWLIST", "  Team@Example.com  ");
    const fresh = loadPresentationDemo(db, old.id);
    expect(fresh.stays[0].email).toBe("team@example.com");
    expect(fresh.requests).toEqual([]);
    expect(getBoard(db, old.id)).toEqual(old);
    expect(boardCount()).toBe(2);
    expect(listEvents(db, fresh.id).map((event) => event.kind)).toEqual(["user_action"]);
  });

  it.each(["", "not-an-address", "front@majungi-demo.test", "a@example.com,b@example.com"])("rejects unsafe or ambiguous real-demo recipient %s", (allowlist) => {
    vi.stubEnv("MAIL_MODE", "real");
    vi.stubEnv("RESEND_API_KEY", "test-placeholder");
    vi.stubEnv("MAIL_FROM", "demo@example.com");
    vi.stubEnv("MAIL_ALLOWLIST", allowlist);
    expect(presentationDemoRecipient()).toBeNull();
    expect(() => loadPresentationDemo(db, null)).toThrow();
    expect(boardCount()).toBe(0);
  });

  it("rejects repeated submissions from the old screen even when all boards share a timestamp", () => {
    const old = createBoard(db);
    const fresh = loadPresentationDemo(db, old.id);
    expect(fresh.created_at).toBe(old.created_at);
    expect(getCurrentBoard(db)?.id).toBe(fresh.id);
    expect(() => loadPresentationDemo(db, old.id)).toThrow();
    expect(boardCount()).toBe(2);
    expect(getCurrentBoard(db)?.id).toBe(fresh.id);
  });

  it("rejects a stale empty screen when another board has since been created", () => {
    const old = createBoard(db);
    expect(() => loadPresentationDemo(db, null)).toThrow();
    expect(getCurrentBoard(db)).toEqual(old);
    expect(boardCount()).toBe(1);
  });

  it("rolls back the new board if its hotel cannot be saved", () => {
    const old = createBoard(db);
    db.$client.exec(`CREATE TEMP TRIGGER reject_demo_stay BEFORE INSERT ON stays
      WHEN NEW.booking_ref = 'DEMO-20261019'
      BEGIN SELECT RAISE(ABORT, 'demo stay insert failed'); END`);

    expect(() => loadPresentationDemo(db, old.id)).toThrow();
    expect(getCurrentBoard(db)).toEqual(old);
    expect(boardCount()).toBe(1);
    expect(listEvents(db, old.id)).toEqual([]);
    expect(db.$client.prepare("SELECT COUNT(*) AS count FROM stays").get()).toEqual({ count: 0 });
  });
});
