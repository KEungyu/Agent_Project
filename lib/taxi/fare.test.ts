import { describe, expect, it } from "vitest";
import { estimateFare, farePeriod } from "./fare";

describe("taxi fare", () => {
  it("charges only the base fare for a very short ride", () => {
    expect(estimateFare(1200, 0, "day")).toMatchObject({ low: 4800, high: 4800 });
  });

  it("adds 100 won for every 131 m after the first 1.6 km in the daytime", () => {
    // 1.6km + 131m × 10 = 2,910m → 4,800 + 1,000
    expect(estimateFare(2910, 0, "day").low).toBe(5800);
  });

  it("uses the late-night rates and widens the range with traffic", () => {
    const night = estimateFare(10_000, 1200, "midnight");
    const day = estimateFare(10_000, 1200, "day");
    expect(night.low).toBeGreaterThan(day.low);
    expect(night.high).toBeGreaterThan(night.low);
    expect(night.low % 100).toBe(0);
  });

  it("adds less time charge on fast highway routes than on slow city streets", () => {
    const highway = estimateFare(50_000, 3000, "day"); // 시속 60km
    const city = estimateFare(50_000, 7200, "day"); // 시속 25km
    expect(highway.high - highway.low).toBeLessThan(city.high - city.low);
  });

  it("adds the 20% outside-Seoul surcharge to the high end only", () => {
    expect(estimateFare(1200, 0, "day", { outsideSeoul: true })).toMatchObject({ low: 4800, high: 5800 });
  });

  it("picks the right period from the Korean clock", () => {
    expect(farePeriod(14 * 60)).toBe("day");
    expect(farePeriod(22 * 60 + 30)).toBe("late");
    expect(farePeriod(23 * 60 + 30)).toBe("midnight");
    expect(farePeriod(60)).toBe("midnight");
    expect(farePeriod(3 * 60)).toBe("late");
    expect(farePeriod(4 * 60)).toBe("day");
  });
});
