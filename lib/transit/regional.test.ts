import { expect, it } from "vitest";
import busan from "../../data/transit/busan-subway.json";
import daegu from "../../data/transit/daegu-subway.json";
import { findStations, stationName, type SubwayData } from "./subway";

it("지역 연결도는 공식 노선의 역 수·연결·신설역을 보존하며 수도권 동명역을 섞지 않는다", () => {
  for (const [data, counts] of [[busan, [40, 43, 17, 14, 21, 23]], [daegu, [35, 29, 30]]] as const) {
    const network = data as unknown as SubwayData;
    const stations = new Map(network.stations.map((s) => [s.id, s]));
    expect(stations.size).toBe(network.stations.length);
    expect(network.source.license).toBe("ODbL 1.0");
    for (const [i, line] of network.lines.entries()) {
      const ids = new Set(line.edges.flat());
      expect(ids.size).toBe(counts[i]);
      expect(line.edges.length).toBe(counts[i] - 1);
      const reached = new Set([line.edges[0][0]]);
      for (let pass = 0; pass < ids.size; pass++) for (const [a, b] of line.edges) {
        expect(stations.get(a)?.lines).toContain(line.id);
        expect(stations.get(b)?.lines).toContain(line.id);
        if (reached.has(a)) reached.add(b);
        if (reached.has(b)) reached.add(a);
      }
      expect(reached.size).toBe(ids.size);
    }
    for (const s of stations.values()) {
      expect(s.en).not.toBe("");
      expect(Number.isFinite(s.lat) && Number.isFinite(s.lon)).toBe(true);
    }
    expect(findStations("Myeongdong", 8, network)).toEqual([]);
    expect(findStations("Seoul", 8, network)).toEqual([]);
    const gyodae = findStations("교대", 8, network)[0];
    expect(stationName(gyodae, "fr")).toBe(gyodae.en);
  }
  const b = busan as unknown as SubwayData;
  const id = (ko: string) => b.stations.find((s) => s.ko === ko)!.id;
  const dh = b.lines.find((l) => l.id === "DH")!;
  const connected = (a: string, c: string) => dh.edges.some((e) => e.includes(id(a)) && e.includes(id(c)));
  expect(connected("안락", "부산원동")).toBe(true);
  expect(connected("부산원동", "재송")).toBe(true);
  expect(connected("안락", "재송")).toBe(false);
  expect(findStations("부전", 8, b)).toHaveLength(2);
  expect(findStations("부전", 8, b).every((s) => s.lines.length === 1)).toBe(true);
  expect(findStations("Hayang", 8, daegu as unknown as SubwayData)[0]?.ko).toBe("하양");
});
