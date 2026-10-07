import { beforeEach, expect, it, vi } from "vitest";
import { callOdsay, clearOdsayCache, searchTransitPaths, subwaySchedule } from "./odsay";
import { scheduledTransit, transitPaths } from "./routes";
import { findStations } from "./subway";
import live from "../../tests/fixtures/odsay-scheduled-2026-10-07.json";

const env = { ODSAY_API_KEY: "mock-web-only" };
const json = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));
beforeEach(clearOdsayCache);

it("WEB 경계에서 일반·막차·역 검색·시각 지정 모두 전달된 WEB 키만 쓴다", async () => {
  const from = findStations("인천공항1터미널")[0];
  const to = findStations("명동")[0];
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    expect(url.origin).toBe("https://api.odsay.com");
    expect(url.searchParams.get("apiKey")).toBe(env.ODSAY_API_KEY);
    expect(url.searchParams.has("lang")).toBe(false); // Basic은 한국어 원문만 받는다.
    const endpoint = url.pathname.split("/").at(-1);
    if (endpoint === "searchPubTransPathT") return new Response(JSON.stringify({ result: { path: [{
      info: { totalTime: 59, payment: 4750, subwayTransitCount: 1, busTransitCount: 0, totalWalk: 0 },
      subPath: [{ trafficType: 1, lane: [{ name: "공항철도" }], startName: from.ko, endName: "서울", startID: 4010, wayCode: 1, sectionTime: 43 }],
    }] } }));
    if (endpoint === "searchSubwaySchedule") return new Response(JSON.stringify({ result: { weekdaySchedule: {
      up: [{ departureTime: "21:03:00", firstLastFlag: 0, subwayClass: 0, endStationName: "서울" }],
    } } }));
    if (endpoint === "searchStation") {
      const s = url.searchParams.get("stationName") === from.ko ? from : to;
      return new Response(JSON.stringify({ result: { station: [{ stationClass: 2, stationName: s.ko, stationID: s === from ? 4010 : 424, x: s.lon, y: s.lat }] } }));
    }
    expect(endpoint).toBe("subwayPathSchedule");
    return new Response(JSON.stringify(live));
  });
  const options = { env, fetch: fetcher, now: () => new Date("2026-10-07T21:00:00+09:00") };
  const paths = await transitPaths(from.id, to.id, "en", false, options);
  expect(paths.status).toBe("ok");
  expect(paths.data?.[0].lastTrain?.status).toBe("ok");
  const scheduled = await scheduledTransit(from.id, to.id, "2026-10-07T21:00", false, options);
  expect(scheduled.data).toMatchObject({ notice: "normal", paths: [{ fare: 4750, departure: "21:03:00" }] });
  expect(fetcher).toHaveBeenCalledTimes(5); // 일반 1, 막차 1, 역 2, 지정 1. 실제 외부 호출은 없다.
  const blocked = vi.fn();
  expect((await transitPaths(from.id, to.id, "en", false, { env: {}, fetch: blocked })).status).toBe("unconfigured");
  expect((await scheduledTransit(from.id, to.id, "2026-10-07T21:00", false, { env: {}, fetch: blocked })).status).toBe("unconfigured");
  expect(blocked).not.toHaveBeenCalled();
});

it("동시 조회를 한 번만 호출하고 키 변경 후 이전 성공 캐시를 쓰지 않는다", async () => {
  const fetcher = json({ result: { weekdaySchedule: { up: [{ departureTime: "23:50", firstLastFlag: 2 }] } } });
  const lookup = (key = env.ODSAY_API_KEY) => subwaySchedule(1, 1, { env: { ODSAY_API_KEY: key }, fetch: fetcher });
  const results = await Promise.all([lookup(), lookup()]);
  expect(results.map((r) => r.status)).toEqual(["ok", "ok"]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((await lookup()).cached).toBe(true);
  expect((await lookup("mock-other-web")).cached).toBeFalsy();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("잘못된 키 인코딩·응답·파서는 비밀 없는 오류이며 실패를 캐시하지 않는다", async () => {
  const fetcher = json(null);
  expect((await subwaySchedule(1, 1, { env: { ODSAY_API_KEY: "%broken" }, fetch: fetcher })).status).toBe("error");
  expect(fetcher).not.toHaveBeenCalled();
  expect(await subwaySchedule(1, 1, { env, fetch: fetcher })).toEqual({ status: "error", code: "invalid_response" });
  expect(await subwaySchedule(1, 1, { env, fetch: fetcher })).toEqual({ status: "error", code: "invalid_response" });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(await callOdsay("test", {}, () => { throw new Error("mock secret"); }, { env, fetch: json({ result: {} }) }))
    .toEqual({ status: "error", code: "invalid_response" });
});

it("누락·null·비수치 요금을 무료 경로나 운행 없음으로 만들지 않는다", async () => {
  for (const payment of [undefined, null, "bad", -1]) {
    const result = await searchTransitPaths({ lat: 37.5, lon: 127 }, { lat: 37.6, lon: 127 }, "en", {
      env, fetch: json({ result: { path: [{ info: { totalTime: 30, payment }, subPath: [] }] } }),
    });
    expect(result).toEqual({ status: "error", code: "invalid_response" });
  }
});
