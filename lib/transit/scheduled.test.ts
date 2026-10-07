import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOdsayCache } from "./odsay";
import { scheduledDeparture, searchScheduledRoutes } from "./scheduled";
import live from "../../tests/fixtures/odsay-scheduled-2026-10-07.json";

const from = { ko: "인천공항1터미널", lon: 126.452461, lat: 37.44747 };
const to = { ko: "명동", lon: 126.986465, lat: 37.560972 };
const path = { info: { day: 1, totalTime: 80, cardFare: 4750, transferCount: 1, departureTime: "21:05:00", arrivalTime: "22:25:00" },
  subPath: [{ movingType: 1, startName: from.ko, endName: to.ko, laneName: "가상 노선", sectionTime: 80, departureTime: "21:05:00", arrivalTime: "22:25:00", isExpressLane: "N" }] };
function adapter(code: unknown = 0, paths: unknown[] = [path]) {
  return vi.fn(async (url: string | URL | Request) => {
    const q = new URL(String(url));
    const station = q.searchParams.get("stationName") === from.ko ? from : to;
    const result = q.pathname.endsWith("searchStation") ? { station: [{ stationClass: 2, stationName: station.ko, stationID: station === from ? 4010 : 424, x: station.lon, y: station.lat }] } : { notificationCode: code, path: paths };
    return new Response(JSON.stringify({ result }));
  });
}
const env = { ODSAY_API_KEY: "fixture-key" };
describe("F2-35~39 시각 지정 지하철", () => {
  beforeEach(clearOdsayCache);
  it("F3-01 실제 응답의 이름 없는 환승 구간을 보존한다 (2026-10-07)", async () => {
    const result = await searchScheduledRoutes(from, to, "2026-10-07T21:00", false, { env, fetch: adapter(0, live.result.path) });
    expect(result.status).toBe("ok");
    expect(result.data?.paths[0]).toMatchObject({ departure: "21:03:00", arrival: "22:02:00", minutes: 59, fare: 4750 });
    expect(result.data?.paths[0].legs[1]).toMatchObject({ transfer: true, minutes: 8, departure: "21:46:30", arrival: "21:54:30" });
  });
  it("F2-35 공식 검색 ID, KST 시각, 요일로 조회하고 응답 시간·요금만 쓴다", async () => {
    const fetcher = adapter();
    const result = await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: fetcher });
    expect(result.data).toMatchObject({ notice: "normal", paths: [{ minutes: 80, fare: 4750, departure: "21:05:00" }] });
    const q = new URL(String(fetcher.mock.calls.at(-1)![0])).searchParams;
    expect(Object.fromEntries(q)).toMatchObject({ SID: "4010", EID: "424", MODE: "1", DAY: "1", TIME: "2100" });
    expect(scheduledDeparture("2026-10-10T21:00")?.day).toBe(2);
    expect(scheduledDeparture("2026-10-11T21:00")?.day).toBe(3);
    expect(scheduledDeparture("2026-10-09T21:00", true)?.day).toBe(3);
  });
  it.each([[2, "first"], [3, "last"], [9, "unknown"]])("F2-36 코드 %s는 정상 출발로 바꾸지 않는다", async (code, notice) => {
    expect((await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: adapter(code) })).data?.notice).toBe(notice);
  });
  it("F2-37 잘못된 날짜·미확인 새벽 경계는 API를 호출하지 않는다", async () => {
    const fetcher = adapter();
    for (const date of ["2026-02-30T21:00", "2026-10-09T25:00", "2026-10-09T01:00"]) {
      expect((await searchScheduledRoutes(from, to, date, false, { env, fetch: fetcher })).status).toBe("error");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("F2-38 이름이 같아도 위치가 다르면 ID를 추측하지 않는다", async () => {
    const fetcher = adapter();
    expect((await searchScheduledRoutes({ ...from, lon: 127 }, to, "2026-10-09T21:00", false, { env, fetch: fetcher })).status).toBe("empty");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("F2-40 키 없음·한도 초과는 시간표 없음으로 바꾸지 않는다", async () => {
    const fetcher = adapter();
    expect((await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env: {}, fetch: fetcher })).status).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
    const limited = vi.fn(async () => new Response(JSON.stringify({ error: [{ code: "429", message: "Daily quota exceeded" }] })));
    expect((await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: limited })).status).toBe("limit");
    expect(limited).toHaveBeenCalledTimes(1);
  });
  it("F2-41 공휴일을 바꾸면 DAY를 바꾸고 평일 결과를 재사용하지 않는다", async () => {
    const fetcher = adapter();
    await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: fetcher });
    const result = await searchScheduledRoutes(from, to, "2026-10-09T21:00", true, { env, fetch: fetcher });
    expect(new URL(String(fetcher.mock.calls.at(-1)![0])).searchParams.get("DAY")).toBe("3");
    expect(result.status).toBe("empty"); // DAY=3 요청에 DAY=1 응답이 오면 표시하지 않는다
  });
  it("F2-39 시각을 바꾸면 다시 조회하고 과거 출발·누락 필드는 성공으로 만들지 않는다", async () => {
    const fetcher = adapter();
    await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: fetcher });
    expect((await searchScheduledRoutes(from, to, "2026-10-09T22:00", false, { env, fetch: fetcher })).data?.notice).toBe("unknown");
    expect(fetcher).toHaveBeenCalledTimes(4); // 역 검색 2회는 캐시
    clearOdsayCache();
    expect((await searchScheduledRoutes(from, to, "2026-10-09T21:00", false, { env, fetch: adapter(0, [{ info: {} }]) })).status).toBe("empty");
  });
});
