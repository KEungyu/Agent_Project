import { expect, it } from "vitest";
import { CITIES } from "./cities";
import { CITY_POINTS } from "./korea-outline";
import { cityIdOf, routeLegs } from "./route";

it("대구·대전·광주를 여행지와 일정 지도에서 사용할 수 있다", () => {
  for (const [id, ko] of [["daegu", "대구"], ["daejeon", "대전"], ["gwangju", "광주"]]) {
    expect(cityIdOf(ko)).toBe(id);
    expect(CITIES.find((city) => city.id === id)?.spots.length).toBeGreaterThanOrEqual(3);
    expect(CITY_POINTS[id]).toHaveLength(2);
  }
  expect(routeLegs(["대구", "대전", "광주"].map((city) => ({ city, date: "2026-10-20", transport: { status: "none" as const } })))).toHaveLength(2);
});

it("대구·대전·광주 관광지는 다른 도시만큼 있고, 9개 언어 설명이 모두 있으며, 사진은 자유 라이선스만 쓴다", async () => {
  const { LANGUAGES } = await import("../i18n/languages");
  const { SPOT_PHOTOS } = await import("./photos");
  const { existsSync } = await import("node:fs");
  const others = CITIES.filter((city) => !["daegu", "daejeon", "gwangju"].includes(city.id));
  const average = others.reduce((n, city) => n + city.spots.length, 0) / others.length;
  for (const id of ["daegu", "daejeon", "gwangju"]) {
    const city = CITIES.find((c) => c.id === id)!;
    expect(city.spots.length).toBeGreaterThanOrEqual(Math.floor(average) - 1);
    expect(new Set(city.spots.map((spot) => spot.name.en)).size).toBe(city.spots.length);
    for (const spot of city.spots) {
      for (const language of LANGUAGES) expect(spot.desc[language.code]?.trim(), `${id}/${spot.name.en}/${language.code}`).toBeTruthy();
      const photo = SPOT_PHOTOS[`${id}/${spot.name.en}`];
      if (photo) {
        expect(photo.license).toMatch(/^(CC0|CC BY(-SA)? [0-9.]+( [a-z]{2})?|Public domain)$/i);
        expect(photo.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        expect(existsSync(`public${photo.src}`)).toBe(true);
      }
    }
  }
});

it("대구·대전·광주에서 가는 구간은 모두 대략 소요 시간과 예매 안내가 있다", async () => {
  const { transportOptions } = await import("../transport/routes");
  for (const [a, b] of [["seoul", "daegu"], ["seoul", "daejeon"], ["seoul", "gwangju"], ["daegu", "gyeongju"], ["daegu", "andong"], ["gwangju", "jeonju"], ["gwangju", "yeosu"], ["daejeon", "jeonju"], ["daegu", "busan"]]) {
    const options = transportOptions(a, b);
    expect(options.length, `${a}-${b}`).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.minutes, `${a}-${b} ${option.mode}`).toBeGreaterThan(0);
      expect(option.booking?.url).toMatch(/^https:\/\//);
    }
    expect(transportOptions(b, a).length).toBe(options.length); // 반대 방향도
  }
});
