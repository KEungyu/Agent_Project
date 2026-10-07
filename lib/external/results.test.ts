import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { listEvents } from "../board/store";
import { openDb } from "../db/client";
import { externalResults, recordExternalResult } from "./results";

const action = { id: "tool_1", provider: "catchtable" as const, summary: [{ label: "Restaurant", value: "Test Restaurant" }, { label: "Branch", value: "Test Branch" }, { label: "Date", value: "2026-10-10" }, { label: "Time", value: "19:00 KST" }, { label: "People", value: "2" }] };

describe("F2-19 외부 예약 사이트 결과 (이용자 기록)", () => {
  it("이용자가 고른 결과만 남고, 가장 최근 값이 현재 값이며, 출처·조건을 함께 기록한다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    expect(externalResults(db, board.id)).toEqual({}); // 열거나 돌아온 것만으로는 아무것도 없다
    recordExternalResult(db, board.id, action, "waitlisted", true);
    recordExternalResult(db, board.id, action, "booked", true);
    expect(externalResults(db, board.id)).toEqual({ tool_1: "booked" });
    const last = listEvents(db, board.id).filter((event) => event.detail.action === "external_result").at(-1)!;
    expect(last.detail).toMatchObject({ provider: "catchtable", result: "booked", source: "user", conditions: action.summary });
    expect(last.at).toBeTruthy();
    // 예약 사이트 결과는 요청(메일 문의)을 만들거나 바꾸지 않는다
    expect(db.$client.prepare("SELECT COUNT(*) AS n FROM requests").get()).toEqual({ n: 0 });
  });

  it("F2-27 날짜·지점·인원이 빠졌거나 카드 조건을 확인하지 않으면 결과를 기록하지 않는다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    expect(recordExternalResult(db, board.id, { ...action, summary: [] }, "booked", true)).toBe(false);
    expect(recordExternalResult(db, board.id, action, "booked", false)).toBe(false);
    expect(externalResults(db, board.id)).toEqual({});
    expect(recordExternalResult(db, board.id, { ...action, summary: [] }, "not_yet")).toBe(true);
  });
});
