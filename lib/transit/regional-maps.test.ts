import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// public/transit/map-<지역>.json (scripts/transit/fetch-map.ts <지역>): 지역 노선도 배경 지도
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));

describe("지역 노선도 배경 지도", () => {
  for (const region of ["busan", "daegu", "daejeon", "gwangju"]) {
    it(`${region}: 출처·범위·강·구 이름이 있고, 범위가 역 자료를 감싼다`, () => {
      const map = read(`public/transit/map-${region}.json`);
      const network = read(`data/transit/${region}-subway.json`);
      expect(map.source.license).toBe("ODbL 1.0");
      expect(map.river.length + (map.streams?.length ?? 0)).toBeGreaterThan(0);
      expect(map.districts.length).toBeGreaterThan(0);
      // 배경 범위가 역 자료 범위를 감싼다 (남·서는 더 작게, 북·동은 더 크게)
      expect(map.bbox[0]).toBeLessThanOrEqual(network.bbox[0]);
      expect(map.bbox[1]).toBeLessThanOrEqual(network.bbox[1]);
      expect(map.bbox[2]).toBeGreaterThanOrEqual(network.bbox[2]);
      expect(map.bbox[3]).toBeGreaterThanOrEqual(network.bbox[3]);
      // 모든 좌표가 배경 범위 안에 있다 (다른 지역 자료가 섞이지 않는다)
      const inBox = ([lat, lon]: number[]) => lat >= map.bbox[0] && lat <= map.bbox[2] && lon >= map.bbox[1] && lon <= map.bbox[3];
      for (const line of [...map.river, ...(map.streams ?? []), ...(map.coast ?? []), ...map.roads]) for (const p of line) expect(inBox(p)).toBe(true);
      for (const d of map.districts) expect(inBox([d.lat, d.lon])).toBe(true);
      // 선로는 그 지역 노선 id만
      const ids = new Set(network.lines.map((line: { id: string }) => line.id));
      for (const track of map.tracks) expect(ids.has(track.line)).toBe(true);
    });
  }

  it("부산은 해안선을 그린다", () => {
    expect(read("public/transit/map-busan.json").coast.length).toBeGreaterThan(0);
  });
});
