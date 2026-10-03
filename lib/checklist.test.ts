import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "./board/demo";
import { createBoard, updateBoard, getBoard } from "./board/store";
import { openDb } from "./db/client";
import { buildChecklist } from "./checklist";

describe("buildChecklist", () => {
  it("starts with nothing ticked on an empty trip and skips items that do not apply", () => {
    const items = buildChecklist(createBoard(openDb(":memory:")));
    expect(items.filter((item) => item.done)).toEqual([]);
    expect(items.map((item) => item.key)).toEqual(["flights", "stay", "cities"]);
  });

  it("ticks what the board already shows and leaves an unanswered late check-in open", () => {
    const byKey = Object.fromEntries(buildChecklist(seedDemoBoard(openDb(":memory:"))).map((item) => [item.key, item])); // 00:40 도착, 출국편, 숙소, 도시 3곳
    expect(byKey.flights.done).toBe(true);
    expect(byKey.stay.done).toBe(true);
    expect(byKey.cities.done).toBe(true);
    expect(byKey.lateCheckin.done).toBe(false);
    expect(byKey.rides).toBeDefined();
  });

  it("needs both flights before ticking flights", () => {
    const db = openDb(":memory:");
    const board = createBoard(db, { arrival: { datetime: "2026-10-20T14:00+09:00", airport: "ICN" } });
    expect(buildChecklist(getBoard(db, board.id)).find((item) => item.key === "flights")?.done).toBe(false);
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
