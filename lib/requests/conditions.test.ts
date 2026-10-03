import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { openDb } from "../db/client";
import { loadRequestTypes } from "../request-types/loader";
import { decideChannel } from "./channel";
import { checkConditions } from "./conditions";

const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;

describe("checkConditions freshness", () => {
  const board = seedDemoBoard(openDb(":memory:")); // 숙소 도착 예정 2026-10-20T01:30+09:00
  const before = new Date("2026-10-19T12:00:00+09:00");
  const after = new Date("2026-10-21T12:00:00+09:00");

  it("uses the saved arrival time while it is still ahead", () => {
    const check = checkConditions(type, board, { now: before });
    expect(check.filled.expected_arrival).toBe("2026-10-20T01:30+09:00");
  });

  it("asks again when the saved arrival time has already passed", () => {
    const check = checkConditions(type, board, { now: after });
    expect(check.filled.expected_arrival).toBeUndefined();
    expect(check.missing.map((slot) => slot.key)).toContain("expected_arrival");
  });

  it("prefers what the traveler just said over the saved value", () => {
    const check = checkConditions(type, board, { now: before, provided: { expected_arrival: "2026-10-20T03:00+09:00" } });
    expect(check.filled.expected_arrival).toBe("2026-10-20T03:00+09:00");
  });

  it("does not treat a passed deadline as urgent", () => {
    const stay = board.stays[0];
    expect(decideChannel(type, stay, { expected_arrival: "2026-10-20T01:30+09:00" }, after).reason).toBe("email_default");
  });
});
