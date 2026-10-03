import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "./board/demo";
import { createBoard, updateBoard, getBoard } from "./board/store";
import { openDb } from "./db/client";
import { buildChecklist } from "./checklist";

describe("buildChecklist", () => {
  it("starts with nothing ticked on an empty trip and skips items that do not apply", () => {
    const items = buildChecklist(createBoard(openDb(":memory:")));
    expect(items.filter((item) => item.done)).toEqual([]);
    expect(items.map((item) => item.key)).not.toContain("lateCheckin");
    expect(items.map((item) => item.key)).not.toContain("rides");
  });

  it("ticks what the board already shows and leaves an unanswered late check-in open", () => {
    const items = buildChecklist(seedDemoBoard(openDb(":memory:"))); // 00:40 도착, 숙소 있음, 도시 3곳
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.flights.done).toBe(true);
    expect(byKey.stay.done).toBe(true);
    expect(byKey.lateCheckin).toMatchObject({ auto: true, done: false });
    expect(byKey.rides.auto).toBe(true);
    expect(byKey.sim).toMatchObject({ auto: false, done: false });
  });

  it("leaves out rides between cities when every leg is by subway", () => {
    const db = openDb(":memory:");
    const board = createBoard(db);
    updateBoard(db, board.id, {
      itinerary: [
        { date: "2026-10-20", city: "Seoul", transport: { status: "none" } },
        { date: "2026-10-21", city: "Suwon", transport: { status: "none" } },
      ],
    });
    expect(buildChecklist(getBoard(db, board.id)).map((entry) => entry.key)).not.toContain("rides");
  });
});
