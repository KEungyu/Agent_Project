import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDb } from "../db/client";
import { addItineraryForm, saveStayForm, saveTripForm } from "./forms";
import { getCurrentBoard } from "./store";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("board forms", () => {
  it("입국일과 숙소를 저장하면 다시 열어도(새로고침) 남아 있다", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "majung-"));
    const file = path.join(dir, "test.db");
    try {
      const db = openDb(file);
      saveTripForm(db, form({ arrival_datetime: "2026-10-20T00:40", arrival_airport: "ICN" }));
      saveStayForm(db, form({ name: "Hotel A", booking_ref: "BK1", expected_arrival: "2026-10-20T01:30" }));
      db.$client.close();

      const reopened = openDb(file);
      const board = getCurrentBoard(reopened)!;
      reopened.$client.close();
      expect(board.arrival).toMatchObject({ datetime: "2026-10-20T00:40+09:00", airport: "ICN" });
      expect(board.stays[0]).toMatchObject({ name: "Hotel A", booking_ref: "BK1", expected_arrival: "2026-10-20T01:30+09:00" });
      expect(board.stays[0].field_sources.booking_ref).toBe("user");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("숙소를 수정하면 같은 숙소가 바뀌고, 빈 칸은 기존 값을 지우지 않는다", () => {
    const db = openDb(":memory:");
    const stayId = saveStayForm(db, form({ name: "Hotel A", email: "a@hotel.test" })).stays[0].id;
    const board = saveStayForm(db, form({ stay_id: stayId, name: "Hotel A", email: "", phone: "+82-2-000" }));
    expect(board.stays).toHaveLength(1);
    expect(board.stays[0]).toMatchObject({ email: "a@hotel.test", phone: "+82-2-000" });
  });

  it("도시 일정은 날짜순으로 쌓이고 교통편 상태는 none으로 시작한다", () => {
    const db = openDb(":memory:");
    addItineraryForm(db, form({ date: "2026-10-22", city: "Gyeongju" }));
    const board = addItineraryForm(db, form({ date: "2026-10-20", city: "Seoul" }));
    expect(board.itinerary.map((item) => item.city)).toEqual(["Seoul", "Gyeongju"]);
    expect(board.itinerary[0].transport.status).toBe("none");
  });

  it("이름 없는 숙소 추가는 거부한다", () => {
    const db = openDb(":memory:");
    expect(() => saveStayForm(db, form({ email: "a@hotel.test" }))).toThrow(/name/);
  });
});
