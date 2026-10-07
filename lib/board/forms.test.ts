import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDb } from "../db/client";
import { addItineraryForm, hasTripData, removeItineraryItem, saveStayForm, saveTripForm, setLegTransport, startNewTrip } from "./forms";
import { getCurrentBoard, listEvents } from "./store";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("board forms", () => {
  it("F2-14 호텔 도착이 비행기 착륙보다 이르면 따로 확인했을 때만 저장한다", () => {
    const db = openDb(":memory:");
    saveTripForm(db, form({ arrival_datetime: "2026-10-09T23:10", arrival_airport: "ICN" }));
    saveStayForm(db, form({ name: "Hotel A", expected_arrival: "2026-10-10T01:00" }));
    const stayId = getCurrentBoard(db)!.stays[0].id;
    // 착륙(23:10)보다 이른 22:00 → 확인 없으면 저장하지 않는다
    expect(() => saveStayForm(db, form({ stay_id: stayId, expected_arrival: "2026-10-09T22:00", confirm_arrival: "on" }))).toThrow(/before the flight lands/);
    expect(getCurrentBoard(db)!.stays[0].expected_arrival).toBe("2026-10-10T01:00+09:00");
    saveStayForm(db, form({ stay_id: stayId, expected_arrival: "2026-10-09T22:00", confirm_arrival: "on", confirm_before_landing: "on" }));
    expect(getCurrentBoard(db)!.stays[0].expected_arrival).toBe("2026-10-09T22:00+09:00");
  });

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

  it("교통편은 마중이 준비(planned)한 뒤 이용자가 예매 완료로 표시하고, 바뀔 때마다 기록이 남는다", () => {
    const db = openDb(":memory:");
    addItineraryForm(db, form({ date: "2026-10-20", city: "Seoul" }));
    addItineraryForm(db, form({ date: "2026-10-22", city: "Gyeongju" }));
    expect(setLegTransport(db, "2026-10-22", "Gyeongju", "planned").itinerary[1].transport).toEqual({ status: "planned" });
    const board = setLegTransport(db, "2026-10-22", "Gyeongju", "booked_by_user", "KTX");
    expect(board.itinerary[1].transport).toEqual({ status: "booked_by_user", note: "KTX" });
    expect(board.itinerary[0].transport).toEqual({ status: "none" });
    const actions = listEvents(db, board.id).map((event) => event.detail);
    expect(actions).toContainEqual(expect.objectContaining({ action: "set_transport", status: "booked_by_user", note: "KTX" }));
    expect(() => setLegTransport(db, "2026-10-30", "Busan", "planned")).toThrow();
  });

  it("도시 일정에서 한 칸을 빼고, 항공편을 다시 저장해도 터미널과 출국 공항이 남는다", () => {
    const db = openDb(":memory:");
    addItineraryForm(db, form({ date: "2026-10-20", city: "Seoul" }));
    addItineraryForm(db, form({ date: "2026-10-22", city: "Gyeongju" }));
    expect(removeItineraryItem(db, "2026-10-20", "Seoul").itinerary.map((item) => item.city)).toEqual(["Gyeongju"]);
    expect(() => removeItineraryItem(db, "2026-10-20", "Seoul")).toThrow();

    saveTripForm(db, form({ arrival_datetime: "2026-10-20T00:40", arrival_airport: "ICN", arrival_terminal: "T2", departure_datetime: "2026-10-25T18:30", departure_airport: "GMP" }));
    const board = saveTripForm(db, form({ arrival_datetime: "2026-10-20T00:40", arrival_airport: "ICN", arrival_terminal: "T2", departure_datetime: "2026-10-25T19:00" }));
    expect(board.arrival).toMatchObject({ airport: "ICN", terminal: "T2" });
    expect(board.departure).toMatchObject({ airport: "GMP", datetime: "2026-10-25T19:00+09:00" });
  });

  it("새 여행을 시작하면 빈 보드가 현재 보드가 되고, 언어는 이어받고, 예전 보드는 남는다", async () => {
    const db = openDb(":memory:");
    saveTripForm(db, form({ arrival_datetime: "2026-10-20T00:40", arrival_airport: "ICN", user_language: "ja" }));
    const old = getCurrentBoard(db)!;
    expect(hasTripData(old)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const fresh = startNewTrip(db);
    expect(getCurrentBoard(db)!.id).toBe(fresh.id);
    expect(fresh.user_language).toBe("ja");
    expect(hasTripData(fresh)).toBe(false);
    expect(fresh.arrival).toBeUndefined();
  });
});
