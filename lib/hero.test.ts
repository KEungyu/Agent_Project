import { describe, expect, it } from "vitest";
import { addStay, createBoard, getBoard, updateBoard } from "./board/store";
import { openDb } from "./db/client";
import { buildHero } from "./hero";
import { getMessages } from "./i18n/messages";

const m = getMessages("en");

describe("buildHero", () => {
  it("puts the first unfinished checklist item on the board and counts progress", () => {
    const db = openDb(":memory:");
    const board = createBoard(db);
    const hero = buildHero(getBoard(db, board.id), [], [], m, new Date("2026-10-01T00:00:00Z"));
    expect(hero.next).toMatchObject({ kind: "checklist", title: m.checklist.items.flights, line: "prep" });
    expect(hero.checklist).toMatchObject({ done: 0, total: 3, next: "flights" });
  });

  it("says all clear once the checklist is done", () => {
    const db = openDb(":memory:");
    const board = createBoard(db, {
      arrival: { datetime: "2026-10-20T14:00+09:00", airport: "ICN" },
      departure: { datetime: "2026-10-25T18:30+09:00", airport: "ICN" },
    });
    updateBoard(db, board.id, { itinerary: [{ date: "2026-10-20", city: "Seoul", transport: { status: "none" } }] });
    addStay(db, board.id, { name: "Hotel" }, "user");
    const hero = buildHero(getBoard(db, board.id), [], [], m, new Date("2026-10-01T00:00:00Z"));
    expect(hero.checklist.done).toBe(hero.checklist.total);
    expect(hero.next.kind).toBe("clear");
  });
});
