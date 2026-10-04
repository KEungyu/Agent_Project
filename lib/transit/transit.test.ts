import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { busLaneDetail, busRide, clearOdsayCache, searchBusLanes, searchTransitPaths, subwaySchedule } from "./odsay";
import { SUBWAY, findStations, getLine, getStation, inSupportedArea, subwayRoute } from "./subway";

const ENV = { ODSAY_API_KEY: "test-key" };
const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const station = (ko: string) => findStations(ko)[0];

describe("N01 앱 내 지하철 노선도 데이터", () => {
  it("출처·라이선스·수집일을 기록한다", () => {
    expect(SUBWAY.source).toMatchObject({ license: "ODbL 1.0", url: "https://www.openstreetmap.org/copyright" });
    expect(SUBWAY.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("모든 노선에 번호·이름·색이 있고, 모든 연결은 실제 역을 가리킨다", () => {
    for (const line of SUBWAY.lines) {
      expect(line.short && line.ko && line.en && /^#[0-9a-f]{6}$/i.test(line.colour)).toBeTruthy();
      expect(line.edges.length).toBeGreaterThan(0);
      for (const [a, b] of line.edges) expect(getStation(a) && getStation(b)).toBeTruthy();
    }
  });

  it("잘 알려진 환승역의 노선이 실제와 맞다", () => {
    const lines = (ko: string) => station(ko).lines.map((id) => getLine(id)!.ko).sort();
    expect(lines("서울")).toEqual(["1호선", "4호선", "경의·중앙선", "공항철도"].sort());
    expect(lines("김포공항")).toEqual(["5호선", "9호선", "공항철도", "김포골드라인", "서해선"].sort());
    expect(lines("고속터미널")).toEqual(["3호선", "7호선", "9호선"].sort());
    expect(lines("홍대입구")).toEqual(["2호선", "경의·중앙선", "공항철도"].sort());
  });

  it("역 연결 경로: 인천공항1터미널 → 명동은 공항철도 서울역에서 4호선으로 갈아탄다", () => {
    const route = subwayRoute(station("인천공항1터미널").id, station("명동").id)!;
    expect(route.legs.map((leg) => getLine(leg.line)!.ko)).toEqual(["공항철도", "4호선"]);
    expect(getStation(route.legs[0].to)!.ko).toBe("서울");
    expect(route.transfers).toBe(1);
  });

  it("영어·'역' 붙인 이름으로도 찾는다", () => {
    expect(station("Myeong-dong").ko).toBe("명동");
    expect(station("서울역").ko).toBe("서울");
  });
});

describe("N02 선택한 버스 노선의 정류장 순서", () => {
  const detail = {
    result: {
      busID: 100,
      busNo: "6001",
      busStartPoint: "A",
      busEndPoint: "C",
      turningPointIdx: 3,
      station: [
        { idx: 2, stationName: "시청", arsID: "02-001", stationDirection: 1, x: 126.97, y: 37.56, nonstopStation: 0 },
        { idx: 1, stationName: "A", arsID: "01-001", stationDirection: 1, x: 126.9, y: 37.5, nonstopStation: 0 },
        { idx: 3, stationName: "C", arsID: "03-001", stationDirection: 0, x: 127, y: 37.6, nonstopStation: 0 },
        { idx: 4, stationName: "시청", arsID: "02-002", stationDirection: 2, x: 126.971, y: 37.561, nonstopStation: 0 },
      ],
    },
  };

  beforeEach(clearOdsayCache);

  it("idx 순서로 정렬하고, 같은 이름의 반대편 정류장은 ARS 번호·방향으로 구분한다", async () => {
    const result = await busLaneDetail(100, "en", { env: ENV, fetch: json(detail) });
    expect(result.data!.stops.map((s) => s.idx)).toEqual([1, 2, 3, 4]);
    const cityHall = result.data!.stops.filter((s) => s.name === "시청");
    expect(cityHall.map((s) => s.arsID)).toEqual(["02-001", "02-002"]);
    expect(cityHall.map((s) => s.direction)).toEqual([1, 2]);
  });

  it("하차가 승차보다 앞이면 거부하고, 회차점을 지나면 알린다", async () => {
    const { data } = await busLaneDetail(100, "en", { env: ENV, fetch: json(detail) });
    expect(busRide(data!, 2, 1).ok).toBe(false);
    expect(busRide(data!, 1, 2)).toEqual({ ok: true, passesTurn: false, stops: 1 });
    expect(busRide(data!, 2, 4).passesTurn).toBe(true);
  });
});

describe("N03·N05 경로 검색 요청", () => {
  beforeEach(clearOdsayCache);

  it("노선도 데이터의 역 좌표만 보내고, 출발 시각 파라미터는 보내지 않는다(현재 기준 일반 경로)", async () => {
    const fetcher = json({ error: [{ code: "-99" }] });
    const from = station("서울");
    const to = station("강남");
    await searchTransitPaths(from, to, "ja", { env: { ...ENV, ODSAY_MULTILANG: "1" }, fetch: fetcher });
    const url = new URL(String((fetcher.mock.calls[0] as unknown[])[0]));
    expect(url.hostname).toBe("api.odsay.com");
    expect(url.pathname).toBe("/v1/api/searchPubTransPathT");
    expect([url.searchParams.get("SX"), url.searchParams.get("SY")]).toEqual([String(from.lon), String(from.lat)]);
    expect([url.searchParams.get("EX"), url.searchParams.get("EY")]).toEqual([String(to.lon), String(to.lat)]);
    expect(url.searchParams.get("lang")).toBe("2");
    expect([...url.searchParams.keys()].some((key) => /time|date/i.test(key))).toBe(false);
  });

  it("무료 요금제(국문만)에서는 lang을 보내지 않는다", async () => {
    const fetcher = json({ error: [{ code: "-99" }] });
    await searchTransitPaths(station("서울"), station("강남"), "en", { env: ENV, fetch: fetcher });
    expect(new URL(String((fetcher.mock.calls[0] as unknown[])[0])).searchParams.has("lang")).toBe(false);
  });

  it("지하철 구간의 승차역 코드·방면과 역 시간표(평일·토요일·휴일, 막차 표시)를 옮긴다", async () => {
    const paths = await searchTransitPaths(station("서울"), station("강남"), "en", {
      env: ENV,
      fetch: json({ result: { path: [{ info: { totalTime: 30 }, subPath: [{ trafficType: 1, lane: [{ name: "2호선" }], startName: "시청", endName: "강남", startID: 201, wayCode: 2, stationCount: 9, sectionTime: 25 }] }] } }),
    });
    expect(paths.data![0].legs[0]).toMatchObject({ stationID: 201, wayCode: 2 });
    const timetable = await subwaySchedule(201, 2, {
      env: ENV,
      fetch: json({ result: { weekdaySchedule: { down: [{ departureTime: "23:58", firstLastFlag: 2, subwayClass: 0, endStationName: "성수" }] }, saturdaySchedule: {}, holidaySchedule: {} } }),
    });
    expect(timetable.data!.weekday.down).toEqual([{ time: "23:58", lastFlag: true, express: false, to: "성수" }]);
  });

  it("경로 결과는 시간·요금·환승·도보를 문서의 필드에서만 옮긴다", async () => {
    const body = {
      result: {
        path: [
          {
            info: { totalTime: 41, payment: 1550, busTransitCount: 0, subwayTransitCount: 2, totalWalk: 320 },
            subPath: [
              { trafficType: 3, distance: 120, sectionTime: 2 },
              { trafficType: 1, lane: [{ name: "수도권 4호선" }], startName: "서울역", endName: "사당", way: "사당", stationCount: 7, sectionTime: 14 },
            ],
          },
        ],
      },
    };
    const result = await searchTransitPaths(station("서울"), station("강남"), "en", { env: ENV, fetch: json(body) });
    expect(result.status).toBe("ok");
    expect(result.data![0]).toMatchObject({ minutes: 41, fare: 1550, transfers: 1, walkMeters: 320 });
    expect(result.data![0].legs[1]).toMatchObject({ kind: "subway", name: "수도권 4호선", way: "사당", stops: 7 });
  });
});

describe("N06 자격 부족·오류·빈 결과·캐시", () => {
  beforeEach(clearOdsayCache);

  it("키가 없으면 호출하지 않고 unconfigured", async () => {
    const fetcher = vi.fn();
    expect((await searchBusLanes("6001", "en", { env: {}, fetch: fetcher })).status).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("권한 오류·시간 초과·빈 결과·지원 지역 밖·700m 이내를 구분한다", async () => {
    expect((await searchBusLanes("1", "en", { env: ENV, fetch: json({}, 403) })).status).toBe("permission");
    const authFailed = await searchBusLanes("1b", "en", { env: ENV, fetch: json({ error: [{ code: "500", message: "[ApiKeyAuthFailed] ApiKey authentication failed." }] }) });
    expect(authFailed).toMatchObject({ status: "permission", code: "ApiKeyAuthFailed" });
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    });
    expect((await searchBusLanes("2", "en", { env: ENV, fetch: timeout })).status).toBe("timeout");
    expect((await searchBusLanes("3", "en", { env: ENV, fetch: json({ error: [{ code: "-99" }] }) })).status).toBe("empty");
    expect((await searchBusLanes("4", "en", { env: ENV, fetch: json({ error: { code: "6" } }) })).status).toBe("out_of_area");
    expect((await searchBusLanes("5", "en", { env: ENV, fetch: json({ error: [{ code: "-98" }] }) })).status).toBe("too_close");
    expect((await searchBusLanes("6", "en", { env: ENV, fetch: json({ result: { lane: [] } }) })).status).toBe("empty");
  });

  it("성공한 결과만 잠시 캐시하고 조회 시각을 함께 돌려준다", async () => {
    const fetcher = json({ result: { lane: [{ busID: 1, busNo: "6001", busStartPoint: "A", busEndPoint: "B", busCityName: "서울" }] } });
    const first = await searchBusLanes("6001", "en", { env: ENV, fetch: fetcher });
    const second = await searchBusLanes("6001", "en", { env: ENV, fetch: fetcher });
    expect(first.fetchedAt).toBeTruthy();
    expect(second.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("특수문자가 있는 키는 한 번만 인코딩한다 (원래 키든 이미 인코딩된 키든)", async () => {
    for (const key of ["a+b/c=", "a%2Bb%2Fc%3D"]) {
      clearOdsayCache();
      const fetcher = json({ result: { lane: [] } });
      await searchBusLanes("6001", "en", { env: { ODSAY_API_KEY: key }, fetch: fetcher });
      expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain("apiKey=a%2Bb%2Fc%3D");
    }
  });

  it("키 값은 오류 결과에 담지 않는다", async () => {
    const result = await searchBusLanes("7", "en", { env: ENV, fetch: json({}, 500) });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });
});

describe("N07·N09 위치 권한과 지원 범위", () => {
  it("화면은 위치 권한(geolocation)을 쓰지 않는다: 역 이름 입력과 노선도 선택만 쓴다", () => {
    const source = readFileSync(path.join(process.cwd(), "app/components/TransitGuide.tsx"), "utf8");
    expect(source).not.toMatch(/geolocation/);
  });

  it("지원 범위 밖(부산)은 범위 밖으로 판단하고, 그 지역 역을 지어내지 않는다", () => {
    expect(inSupportedArea(35.115, 129.041)).toBe(false);
    expect(findStations("서면")).toEqual([]);
    expect(inSupportedArea(37.5547, 126.9707)).toBe(true);
  });
});
