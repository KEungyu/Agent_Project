import { describe, expect, it, vi } from "vitest";
import { geocodeCandidates } from "../taxi/lookup";
import { nearestStations } from "./nearest";

describe("장소에서 가까운 역 (N03)", () => {
  it("명동 근처 좌표에서는 명동역이 가장 가깝고 직선거리(m)를 함께 준다", () => {
    const [first] = nearestStations(37.5609, 126.9863);
    expect(first.station.ko).toBe("명동");
    expect(first.meters).toBeLessThan(100);
  });

  it("지원 범위 밖(부산)이면 역을 주지 않는다", () => {
    expect(nearestStations(35.1151, 129.0422)).toEqual([]);
  });

  it("지도 검색 후보는 도로를 빼고, 같은 이름을 구분할 주소를 붙인다", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify([
          { lat: "37.5", lon: "127.0", name: "Mingles", display_name: "Mingles, 19, Dosan-daero, Gangnam-gu, Seoul", category: "amenity" },
          { lat: "37.4", lon: "127.1", name: "Mingles-ro", display_name: "Mingles-ro, Somewhere", category: "highway" },
        ]),
      ),
    );
    const places = await geocodeCandidates("Mingles test", "en", fetcher as unknown as typeof fetch);
    expect(places).toEqual([{ lat: 37.5, lng: 127, label: "Mingles", detail: "19, Dosan-daero" }]);
  });
});
