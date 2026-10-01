import { describe, expect, it } from "vitest";
import type { ItineraryItem } from "../board/types";
import { CITIES } from "./cities";
import { cityIdOf, localCityName, routeLegs } from "./route";
import { LANGUAGES } from "../i18n/languages";

const item = (city: string, status: "none" | "booked_by_user" = "none"): ItineraryItem => ({ date: "2026-10-20", city, transport: { status } });

describe("map route", () => {
  it("로마자·한글 도시 이름을 거점으로 바꾼다", () => {
    expect(cityIdOf("Gyeongju")).toBe("gyeongju");
    expect(cityIdOf(" seoul ")).toBe("seoul");
    expect(cityIdOf("부산")).toBe("busan");
    expect(cityIdOf("Daejeon")).toBeUndefined();
  });

  it("인천공항 → 일정 순서로 구간을 만들고, 교통편 없는 구간을 표시한다", () => {
    const legs = routeLegs([item("Seoul"), item("Gyeongju"), item("Busan", "booked_by_user")], "ICN");
    expect(legs).toEqual([
      { from: "incheon", to: "seoul", arranged: true },
      { from: "seoul", to: "gyeongju", arranged: false },
      { from: "gyeongju", to: "busan", arranged: true },
    ]);
  });

  it("공항이 없으면 첫 도시부터 잇고, 지도에 없는 도시는 건너뛴다", () => {
    expect(routeLegs([item("Seoul"), item("Daejeon"), item("Busan")], "GMP")).toEqual([{ from: "seoul", to: "busan", arranged: false }]);
  });

  it("모든 도시와 관광지가 9개 언어로 준비되어 있다", () => {
    for (const city of CITIES) {
      for (const { code } of LANGUAGES) {
        expect(city.name[code], `${city.id} name ${code}`).toBeTruthy();
        expect(city.tagline[code], `${city.id} tagline ${code}`).toBeTruthy();
        for (const spot of city.spots) expect(spot.desc[code], `${city.id}/${spot.name.en} ${code}`).toBeTruthy();
      }
    }
  });

  it("shows map cities in the user's language and leaves other cities as typed", () => {
    expect(localCityName("Gyeongju", "ja")).toBe(CITIES.find((city) => city.id === "gyeongju")?.name.ja);
    expect(localCityName("Daejeon", "ja")).toBe("Daejeon");
  });
});
