import { describe, expect, it } from "vitest";
import { checkLastTrains, dayTypeAt, type Reaches } from "./lasttrain";
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
// 기존 검사: 시간표의 모든 열차가 내릴 역까지 간다고 둔다
const all: Reaches = () => true;

describe("막차 확인 (N04)", () => {
  it("F2-23 새벽 운행일 기준을 제공사 자료로 검증하지 못했으면 가능을 단정하지 않는다", async () => {
    const check = await checkLastTrains(path([subway("A", 10)]), at("2026-10-09T00:10:00+09:00"), async () => schedule("00:30"), all);
    expect(check.status).toBe("unknown");
    expect(check.legs[0].status).toBe("unknown");
  });

  it("F2-24 초 단위로 이미 떠난 열차와 잘못된 시각은 탈 수 없다고 본다", async () => {
    const day = { up: [{ time: "22:00:10", lastFlag: true, express: false, to: "Z" }], down: [] };
    const check = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T22:00:20+09:00"), async () => ({ status: "ok", data: { weekday: day, saturday: day, holiday: day } }), all);
    expect(check.status).toBe("missed");
    day.up[0].time = "22:99";
    const invalid = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T22:00:20+09:00"), async () => ({ status: "ok", data: { weekday: day, saturday: day, holiday: day } }), all);
    expect(invalid.status).toBe("unknown");
  });
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
      all,
    );
    expect(check.legs.map((leg) => [leg.reachAt, leg.last, leg.status])).toEqual([
      ["23:30", "00:30", "ok"],
      ["00:55", "23:50", "missed"], // 00:30 열차를 기다려 타고(20분) 걸어서(5분) 00:55에 닿는다
    ]);
    expect(check.status).toBe("missed");
  });

  it("자정을 넘긴 막차(00:30)는 23:50 도착보다 늦은 시각으로 계산한다", async () => {
    const check = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T23:50:00+09:00"), async () => schedule("00:30"), all);
    expect(check.status).toBe("ok");
  });

  it("역 코드·방면이 없거나 시간표를 못 받으면 '확인 못함'이고, 버스 구간이 있으면 '가능'이라고 하지 않는다", async () => {
    const unknown = await checkLastTrains(path([subway("A", 10, 0, 0)]), at("2026-10-08T20:00:00+09:00"), async () => schedule("23:00"), all);
    expect(unknown.status).toBe("unknown");
    const failed = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T20:00:00+09:00"), async () => ({ status: "timeout" }), all);
    expect(failed.status).toBe("unknown");
    const withBus = await checkLastTrains(
      path([subway("A", 10), { kind: "bus", name: "740", from: "B", to: "C", stops: 4, minutes: 12, stations: [] }]),
      at("2026-10-08T20:00:00+09:00"),
      async () => schedule("23:00"),
      all,
    );
    expect(withBus).toMatchObject({ status: "unknown", busNotChecked: true });
  });

  // F2-09 검토 반례 A: 22:00 A→Z. Z까지 가는 막차는 21:50, 23:00 열차는 Z 전의 B에서 끝난다 → 못 간다
  it("F2-09 내릴 역 앞에서 끝나는 열차(중간 종착)는 탈 수 있는 열차로 치지 않는다", async () => {
    const day = { up: [{ time: "21:50", lastFlag: false, express: false, to: "Z" }, { time: "23:00", lastFlag: true, express: false, to: "B" }], down: [] };
    const reaches: Reaches = (_leg, terminus) => terminus === "Z";
    const check = await checkLastTrains(
      path([{ ...subway("A", 15), to: "Z", stations: ["A", "B", "Z"] }]),
      at("2026-10-08T22:00:00+09:00"),
      async () => ({ status: "ok", data: { weekday: day, saturday: day, holiday: day } }),
      reaches,
    );
    expect(check.legs[0]).toMatchObject({ last: "21:50", status: "missed" });
    expect(check.status).toBe("missed");
  });

  // F2-10 검토 반례 B: 22:00 A역, 첫 열차 22:20, 10분 → X 22:30. X에서 갈아탈 막차 22:15 → 못 간다 (대기 포함)
  it("F2-10 기다리는 시간을 넣어 환승역 도착을 계산한다", async () => {
    const one = (time: string) => ({ up: [{ time, lastFlag: true, express: false, to: "END" }], down: [] });
    const check = await checkLastTrains(
      path([subway("A", 10, 1), subway("X", 10, 2)]),
      at("2026-10-08T22:00:00+09:00"),
      async (stationID) => {
        const day = one(stationID === 1 ? "22:20" : "22:15");
        return { status: "ok", data: { weekday: day, saturday: day, holiday: day } };
      },
      all,
    );
    expect(check.legs.map((leg) => [leg.reachAt, leg.board ?? "", leg.status])).toEqual([
      ["22:00", "22:20", "ok"],
      ["22:30", "", "missed"],
    ]);
    expect(check.status).toBe("missed");
  });

  it("F2-11 급행과 종착역을 모르는 열차는 쓰지 않고, 그뿐이면 '확인 필요'로 둔다", async () => {
    const day = { up: [{ time: "23:00", lastFlag: false, express: true, to: "Z" }, { time: "23:30", lastFlag: true, express: false, to: "?" }], down: [] };
    const check = await checkLastTrains(
      path([subway("A", 10), subway("C", 10, 2)]),
      at("2026-10-08T22:50:00+09:00"),
      async () => ({ status: "ok", data: { weekday: day, saturday: day, holiday: day } }),
      (_leg, terminus) => (terminus === "Z" ? true : undefined),
    );
    expect(check.legs[0].status).toBe("unknown");
    // 앞 구간을 확인하지 못하면 다음 구간의 닿는 시각을 만들지 않는다
    expect(check.legs[1]).toMatchObject({ reachAt: "", status: "unknown" });
    expect(check.status).toBe("unknown");
  });

  it("F2-12 실제 노선도 자료: 4호선 오이도행은 명동→사당을 가고, 사당에서 끝나는 열차는 사당 너머(남태령)로 못 간다", async () => {
    const { serviceReaches } = await import("./subway");
    expect(serviceReaches("수도권 4호선", "오이도", "명동", "사당", ["명동", "회현", "서울역", "숙대입구", "삼각지", "신용산", "이촌", "동작", "총신대입구(이수)", "사당"])).toBe(true);
    expect(serviceReaches("수도권 4호선", "사당", "명동", "남태령", ["명동", "회현", "사당", "남태령"])).toBe(false);
    expect(serviceReaches("없는 노선", "어딘가", "명동", "사당", [])).toBeUndefined();
  });

  it("F2-18 이용자가 공휴일이라고 하면 평일이어도 휴일 시간표를 쓴다", async () => {
    const day = (time: string) => ({ up: [{ time, lastFlag: true, express: false, to: "A" }], down: [] });
    const schedule = { status: "ok" as const, data: { weekday: day("23:50"), saturday: day("23:50"), holiday: day("23:00") } };
    const weekday = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T23:30:00+09:00"), async () => schedule, all);
    const holiday = await checkLastTrains(path([subway("A", 10)]), at("2026-10-08T23:30:00+09:00"), async () => schedule, all, true);
    expect([weekday.dayType, weekday.status]).toEqual(["weekday", "ok"]);
    expect([holiday.dayType, holiday.status]).toEqual(["holiday", "missed"]);
  });

  it("하행(wayCode 2)은 하행 시간표를 쓴다", async () => {
    const check = await checkLastTrains(path([subway("A", 10, 1, 2)]), at("2026-10-08T23:40:00+09:00"), async () => schedule("00:10", "23:30"), all);
    expect(check.legs[0]).toMatchObject({ last: "23:30", status: "missed" });
  });
});
