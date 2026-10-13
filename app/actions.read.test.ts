import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDb, type Db } from "../lib/db/client";
import { createBoard, getCurrentBoard, listEvents, recordEvent } from "../lib/board/store";
import { revalidatePath } from "next/cache";
import { icnFlightStatus } from "../lib/airport/flights";

let db: Db;
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/client", async (original) => ({
  ...await original<typeof import("../lib/db/client")>(),
  getDb: () => db,
}));
vi.mock("@/lib/airport/flights", () => ({
  icnFlightStatus: vi.fn(async () => ({ status: "ok", data: [] })),
}));
const { externalResultsAction, flightStatusAction, loadDemoAction } = await import("./actions");

beforeEach(() => {
  db = openDb(":memory:");
  vi.clearAllMocks();
  vi.stubEnv("MAIL_MODE", "mock");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected external call"); }));
});

afterEach(() => {
  db.$client.close();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("read actions before the first presentation load (isolated DB, no external calls)", () => {
  it.each(["external results", "arrival flight", "departure flight"])("%s leaves an empty board empty, so the first demo click succeeds", async (read) => {
    if (read === "external results") {
      // Chat runs this action on mount, including when the server rendered boardId=null.
      expect(await externalResultsAction()).toEqual({});
      expect(await externalResultsAction()).toEqual({});
    } else {
      expect(await flightStatusAction(read === "arrival flight" ? "arrival" : "departure", "en")).toEqual({ status: "empty" });
    }
    expect(getCurrentBoard(db)).toBeNull();
    expect(icnFlightStatus).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await loadDemoAction(null)).toEqual({ ok: true });
    expect(getCurrentBoard(db)?.stays[0].booking_ref).toBe("DEMO-20261019");
    expect(db.$client.prepare("SELECT COUNT(*) AS count FROM trip_boards").get()).toEqual({ count: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads an existing board's saved results and both flights without modifying it", async () => {
    const board = createBoard(db, {
      arrival: { datetime: "2026-10-19T22:30+09:00", airport: "ICN", flight_no: "KE123" },
      departure: { datetime: "2026-10-25T18:30+09:00", airport: "ICN", flight_no: "KE456" },
    });
    recordEvent(db, board.id, "user_action", { action: "external_result", action_id: "booking-demo", result: "booked" });
    const eventsBefore = listEvents(db, board.id);

    expect(await externalResultsAction()).toEqual({ "booking-demo": "booked" });
    expect(await flightStatusAction("arrival", "ko")).toEqual({ status: "ok", data: [] });
    expect(await flightStatusAction("departure", "invalid-language")).toEqual({ status: "ok", data: [] });
    expect(icnFlightStatus).toHaveBeenNthCalledWith(1, "arrival", "KE123", board.arrival!.datetime, "ko");
    expect(icnFlightStatus).toHaveBeenNthCalledWith(2, "departure", "KE456", board.departure!.datetime, "en");
    expect(getCurrentBoard(db)).toEqual(board);
    expect(listEvents(db, board.id)).toEqual(eventsBefore);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("still rejects an old empty screen when another user action has created a board", async () => {
    const board = createBoard(db);
    expect(await externalResultsAction()).toEqual({});
    expect(await loadDemoAction(null)).toMatchObject({ ok: false });
    expect(getCurrentBoard(db)).toEqual(board);
    expect(db.$client.prepare("SELECT COUNT(*) AS count FROM trip_boards").get()).toEqual({ count: 1 });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
