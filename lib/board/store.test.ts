import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDb } from "../db/client";
import { addStay, createBoard, getBoard, listEvents, recordEvent, updateStay } from "./store";

const SAMPLE_STAY = {
  name: "Hotel Example Myeongdong",
  email: "front@hotel-example.test",
  booking_ref: "BK123456",
  guest_name: "Emma Smith",
  check_in_date: "2026-10-19",
};

let tempDir: string | undefined;
afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("board store", () => {
  it("재시작(연결을 닫고 다시 열기) 후에도 보드와 숙소가 남아 있다", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "majung-"));
    const file = path.join(tempDir, "test.db");

    const first = openDb(file);
    const board = createBoard(first, { arrival: { datetime: "2026-10-20T00:40+09:00", airport: "ICN" } });
    addStay(first, board.id, SAMPLE_STAY, "user");
    first.$client.close();

    const second = openDb(file);
    const reloaded = getBoard(second, board.id);
    second.$client.close();

    expect(reloaded?.arrival).toEqual({ datetime: "2026-10-20T00:40+09:00", airport: "ICN" });
    expect(reloaded?.stays).toHaveLength(1);
    expect(reloaded?.stays[0]).toMatchObject(SAMPLE_STAY);
  });

  it("값을 쓰면 필드마다 출처(user / extracted)가 기록된다", () => {
    const db = openDb(":memory:");
    const board = createBoard(db);
    const stay = addStay(db, board.id, { name: "Hotel A" }, "user");
    expect(stay.field_sources).toEqual({ name: "user" });

    const updated = updateStay(db, stay.id, { email: "a@hotel.test", phone: "+82-2-000-0000" }, "extracted");
    expect(updated.field_sources).toEqual({ name: "user", email: "extracted", phone: "extracted" });

    const corrected = updateStay(db, stay.id, { email: "front@hotel.test" }, "user");
    expect(corrected.field_sources.email).toBe("user");
    expect(corrected.email).toBe("front@hotel.test");
  });

  it("이벤트를 시각과 함께 순서대로 기록한다", () => {
    const db = openDb(":memory:");
    const board = createBoard(db);
    recordEvent(db, board.id, "user_action", { action: "open_app" });
    recordEvent(db, board.id, "tool_call", { tool: "board_get" });

    const logged = listEvents(db, board.id);
    expect(logged.map((event) => event.kind)).toEqual(["user_action", "tool_call"]);
    expect(logged.every((event) => !Number.isNaN(Date.parse(event.at)))).toBe(true);
  });
});
