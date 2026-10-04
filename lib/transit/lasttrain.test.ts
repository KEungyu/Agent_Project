import { describe, expect, it } from "vitest";
import { checkLastTrains, dayTypeAt } from "./lasttrain";
import type { OdsayResult, SubwaySchedule, TransitPath } from "./odsay";

const at = (iso: string) => new Date(iso);
const schedule = (lastUp: string, lastDown = lastUp): OdsayResult<SubwaySchedule> => {
  const day = {
    up: [{ time: "22:10", lastFlag: false, express: false, to: "A" }, { time: lastUp, lastFlag: true, express: false, to: "A" }],
    down: [{ time: "22:10", lastFlag: false, express: false, to: "B" }, { time: lastDown, lastFlag: true, express: false, to: "B" }],
  };
  return { status: "ok", data: { weekday: day, saturday: day, holiday: day } };
};
const subway = (from: string, minutes: number, stationID = 1, wayCode = 1) => ({ kind: "subway" as const, name: "2호선", from, to: "X", stops: 3, minutes, stations: [], stationID, wayCode });
const path = (legs: TransitPath["legs"]): TransitPath => ({ minutes: 0, fare: 0, transfers: 0, walkMeters: 0, legs });

describe("막차 확인 (N04)", () => {
  it("새벽 4시 전은 전날 운행일로 본다: 토 23:00 → 토요일, 일 01:00 → 토요일, 월 02:00 → 휴일(일요일)", () => {
    expect(dayTypeAt(at("2026-10-10T23:00:00+09:00"))).toBe("saturday");
    expect(dayTypeAt(at("2026-10-11T01:00:00+09:00"))).toBe("saturday");
    expect(dayTypeAt(at("2026-10-12T02:00:00+09:00"))).toBe("holiday");
    expect(dayTypeAt(at("2026-10-12T09:00:00+09:00"))).toBe("weekday");
  });

  it("첫 구간은 막차 전이어도 환승 구간이 막차 뒤면 전체를 '놓침'으로 본다", async () => {
    const check = await checkLastTrains(
      path([subway("홍대입구", 20, 1), { kind: "walk", meters: 200, minutes: 5 }, subway("시청", 10, 2)]),
      at("2026-10-08T23:30:00+09:00"),
      async (stationID) => (stationID === 1 ? schedule("00:30") : schedule("23:50")),
    );
    expect(check.legs.map((leg) => [leg.reachAt, leg.last, leg.status])).toEqual([
      ["23:30", "00:30", "ok"],
      ["23:55", "23:50", "missed"],
    ]);
    expect(check.status).toBe("missed");
  });

  it("자정을 넘긴 막차(00:30)는 23:50 도착보다 늦은 시각으로 계산한다", async () => {
    const check = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T23:50:00+09:00"), async () => schedule("00:30"));
    expect(check.status).toBe("ok");
  });

  it("역 코드·방면이 없거나 시간표를 못 받으면 '확인 못함'이고, 버스 구간이 있으면 '가능'이라고 하지 않는다", async () => {
    const unknown = await checkLastTrains(path([subway("A", 10, 0, 0)]), at("2026-10-08T20:00:00+09:00"), async () => schedule("23:00"));
    expect(unknown.status).toBe("unknown");
    const failed = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T20:00:00+09:00"), async () => ({ status: "timeout" }));
    expect(failed.status).toBe("unknown");
    const withBus = await checkLastTrains(
      path([subway("A", 10), { kind: "bus", name: "740", from: "B", to: "C", stops: 4, minutes: 12, stations: [] }]),
      at("2026-10-08T20:00:00+09:00"),
      async () => schedule("23:00"),
    );
    expect(withBus).toMatchObject({ status: "unknown", busNotChecked: true });
  });

  it("하행(wayCode 2)은 하행 시간표를 쓴다", async () => {
    const check = await checkLastTrains(path([subway("A", 10, 1, 2)]), at("2026-10-08T23:40:00+09:00"), async () => schedule("00:10", "23:30"));
    expect(check.legs[0]).toMatchObject({ last: "23:30", status: "missed" });
  });
});
