import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOdsayCache, searchTransitPaths, subwaySchedule } from "./odsay";
import { SUBWAY, findStations, getLine, getStation, inSupportedArea, legDirection, lineName, stationName, subwayRoute, terminusName } from "./subway";

const ENV = { ODSAY_API_KEY: "test-key" };
const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const station = (ko: string) => findStations(ko)[0];
// 상태 구분·캐시·키 처리는 모든 ODsay 호출이 같은 길을 쓴다: 역 시간표 조회로 확인한다 (역 코드를 달리해 캐시를 나눈다)
const lookup = (id: number, options: Parameters<typeof subwaySchedule>[2]) => subwaySchedule(id, 1, options);

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

  it("역 번호·띄어쓰기 없는 영어로도 찾는다 (표지판의 번호, 예: 424 = 명동)", () => {
    expect(station("424").ko).toBe("명동");
    expect(station("a10").ko).toBe("인천공항1터미널");
    expect(station("myeongdong").ko).toBe("명동");
    expect(station("시청").codes).toMatchObject({ L1: "132", L2: "201" });
  });

  it("방면은 운행 계통의 실제 종착역으로, 2호선 순환 구간은 내선(시계)·외선(반시계)으로 알린다", () => {
    const dir = (line: string, a: string, b: string) => legDirection(line, station(a).id, station(b).id);
    const toward = (line: string, a: string, b: string) => {
      const d = dir(line, a, b);
      return d.kind === "toward" ? d.names : [];
    };
    expect(toward("L4", "명동", "회현")).toContain("오이도");
    expect(toward("L4", "서울", "회현")).toContain("진접");
    expect(toward("AREX", "인천공항1터미널", "공항화물청사")).toEqual(["서울"]);
    expect(dir("L2", "시청", "을지로입구")).toEqual({ kind: "loop", clockwise: true });
    expect(dir("L2", "강남", "역삼")).toEqual({ kind: "loop", clockwise: false });
  });

  it("영어·'역' 붙인 이름으로도 찾는다", () => {
    expect(station("Myeong-dong").ko).toBe("명동");
    expect(station("서울역").ko).toBe("서울");
  });

  it("역·노선 이름을 화면 언어로 쓴다 (일·중은 OSM 이름, 라틴 문자 언어는 로마자, 한국어는 그대로)", () => {
    const myeongdong = station("명동");
    expect(stationName(myeongdong, "ko")).toBe("명동");
    expect(stationName(myeongdong, "ja")).toBe("ミョンドン");
    expect(stationName(myeongdong, "zh-CN")).toBe("明洞");
    expect(stationName(myeongdong, "fr")).toBe(myeongdong.en);
    expect(stationName(station("서울"), "zh-CN")).toBe("首尔");
    expect(lineName(getLine("L4")!, "fr")).toBe("Ligne 4");
    expect(lineName(getLine("L4")!, "ja")).toBe("4号線");
    expect(lineName(getLine("SBD")!, "es")).toBe("Línea Shinbundang");
    expect(lineName(getLine("AREX")!, "zh-CN")).toBe("机场铁路(AREX)");
    // 모든 역에 화면 언어 이름이 있다 (없으면 한국어로 대신)
    for (const language of ["en", "ja", "zh-CN", "fr", "es", "vi", "th", "id"])
      for (const s of SUBWAY.stations) expect(stationName(s, language)).toBeTruthy();
  });

  it("범위 밖 종착역(방면)도 화면 언어로 쓴다", () => {
    expect(terminusName("오이도", "fr")).toBe("Oido");
    expect(terminusName("춘천", "ja")).toBe("春川");
    expect(terminusName("명동", "zh-CN")).toBe("明洞");
    expect(terminusName("없는역", "fr")).toBe("없는역");
  });

  it("불어·스페인어·베트남어·인니어는 설명 단어만 옮기고, 목록에 없는 역은 표지판 영어를 쓴다", () => {
    expect(stationName(station("시청"), "fr")).toBe("Hôtel de ville");
    expect(stationName(station("홍대입구"), "es")).toBe("Universidad Hongik");
    expect(stationName(station("강남구청"), "vi")).toBe("Văn phòng quận Gangnam");
    expect(stationName(station("김포공항"), "id")).toBe("Bandara Internasional Gimpo");
    expect(stationName(station("시청"), "th")).toBe("City Hall");
    expect(stationName(station("명동"), "fr")).toBe(station("명동").en);
    expect(station("정부과천청사").en).toBe("Government Complex Gwacheon");
    // 옮긴 이름·악센트 없이도 찾는다
    expect(station("Hôtel de ville").ko).toBe("시청");
    expect(station("universite hongik").ko).toBe("홍대입구");
  });

  it("일본어·중국어 이름으로도 찾는다", () => {
    expect(station("ミョンドン").ko).toBe("명동");
    expect(station("首尔站").ko).toBe("서울");
    expect(station("弘大入口").ko).toBe("홍대입구");
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

  it("경로 검색은 지하철만 요청한다 (SearchPathType=1, 버스 경로 없음)", async () => {
    const fetcher = json({ error: [{ code: "-99" }] });
    await searchTransitPaths(station("서울"), station("강남"), "en", { env: ENV, fetch: fetcher });
    expect(new URL(String((fetcher.mock.calls[0] as unknown[])[0])).searchParams.get("SearchPathType")).toBe("1");
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

  it("F2-25 열차 타입이 누락됐으면 일반열차로 추정하지 않는다", async () => {
    const result = await lookup(99, { env: ENV, fetch: json({ result: { weekdaySchedule: { up: [{ departureTime: "22:10:00", endStationName: "성수" }] } } }) });
    expect(result.data!.weekday.up[0].express).toBe(true); // 정차역이 검증되지 않은 열차는 제외
  });

  it("키가 없으면 호출하지 않고 unconfigured", async () => {
    const fetcher = vi.fn();
    expect((await lookup(100, { env: {}, fetch: fetcher })).status).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("권한 오류·시간 초과·빈 결과·지원 지역 밖·700m 이내를 구분한다", async () => {
    expect((await lookup(1, { env: ENV, fetch: json({}, 403) })).status).toBe("permission");
    const authFailed = await lookup(11, { env: ENV, fetch: json({ error: [{ code: "500", message: "[ApiKeyAuthFailed] ApiKey authentication failed." }] }) });
    expect(authFailed).toMatchObject({ status: "permission", code: "ApiKeyAuthFailed" });
    const quota = await lookup(12, { env: ENV, fetch: json({ error: [{ code: "429", message: "Daily quota exceeded" }] }) });
    expect(quota).toMatchObject({ status: "limit", code: "429" });
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    });
    expect((await lookup(2, { env: ENV, fetch: timeout })).status).toBe("timeout");
    expect((await lookup(3, { env: ENV, fetch: json({ error: [{ code: "-99" }] }) })).status).toBe("empty");
    expect((await lookup(4, { env: ENV, fetch: json({ error: { code: "6" } }) })).status).toBe("out_of_area");
    expect((await lookup(5, { env: ENV, fetch: json({ error: [{ code: "-98" }] }) })).status).toBe("too_close");
    expect((await lookup(6, { env: ENV, fetch: json({ result: { weekdaySchedule: {}, saturdaySchedule: {}, holidaySchedule: {} } }) })).status).toBe("empty");
  });

  it("성공한 결과만 잠시 캐시하고 조회 시각을 함께 돌려준다", async () => {
    const fetcher = json({ result: { weekdaySchedule: { up: [{ departureTime: "23:50", firstLastFlag: 2 }] } } });
    const first = await lookup(7, { env: ENV, fetch: fetcher });
    const second = await lookup(7, { env: ENV, fetch: fetcher });
    expect(first.fetchedAt).toBeTruthy();
    expect(second.cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("F2-08 실패는 캐시하지 않는다: 키·권한을 고친 뒤 바로 다시 조회된다", async () => {
    const refused = await lookup(8, { env: ENV, fetch: json({ error: [{ code: "500", message: "[ApiKeyAuthFailed]" }] }) });
    expect(refused.status).toBe("permission");
    const fixed = await lookup(8, { env: ENV, fetch: json({ result: { weekdaySchedule: { up: [{ departureTime: "23:50", firstLastFlag: 2 }] } } }) });
    expect(fixed.status).toBe("ok");
    expect(fixed.cached).toBeFalsy();
  });

  it("특수문자가 있는 키는 한 번만 인코딩한다 (원래 키든 이미 인코딩된 키든)", async () => {
    for (const key of ["a+b/c=", "a%2Bb%2Fc%3D"]) {
      clearOdsayCache();
      const fetcher = json({ result: {} });
      await lookup(8, { env: { ODSAY_API_KEY: key }, fetch: fetcher });
      expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain("apiKey=a%2Bb%2Fc%3D");
    }
  });

  it("키 값은 오류 결과에 담지 않는다", async () => {
    const result = await lookup(9, { env: ENV, fetch: json({}, 500) });
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
