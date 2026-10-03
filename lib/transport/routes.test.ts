import { describe, expect, it } from "vitest";
import { CITIES } from "../map/cities";
import { transportOptions, viaRoutes } from "./routes";

describe("transport options", () => {
  it("recommends KTX first between Seoul and Gyeongju, in both directions", () => {
    const there = transportOptions("seoul", "gyeongju");
    expect(there[0].mode).toBe("ktx");
    expect(there[0].from.ko).toBe("서울역");
    const back = transportOptions("gyeongju", "seoul");
    expect(back[0].from.ko).toBe("신경주역");
    expect(back[0].to.ko).toBe("서울역");
  });

  it("only flies to Jeju and needs no booking for the subway", () => {
    expect(transportOptions("busan", "jeju").map((option) => option.mode)).toEqual(["flight"]);
    expect(transportOptions("seoul", "suwon")[0].booking).toBeUndefined();
  });

  it("returns nothing for routes Majung does not know yet", () => {
    expect(transportOptions("andong", "jeju")).toEqual([]);
  });
});

import { airportTransfers, isLateHour } from "./airport";

describe("airport transfers", () => {
  it("puts night-capable options first after 23:00 and marks trains as not running", () => {
    const late = airportTransfers("ICN", isLateHour(40));
    expect(late[0].id).toBe("intlTaxi");
    expect(late.find((item) => item.id === "arex")?.available).toBe(false);
    expect(late.some((item) => item.id === "nightBus")).toBe(true);
  });

  it("recommends the airport railroad in the daytime and hides the night bus", () => {
    const day = airportTransfers("ICN", isLateHour(14 * 60));
    expect(day[0].id).toBe("arex");
    expect(day.some((item) => item.id === "nightBus")).toBe(false);
    expect(day.every((item) => item.available)).toBe(true);
    expect(airportTransfers("PUS", false)).toEqual([]);
  });
});

describe("viaRoutes", () => {
  const ids = CITIES.map((city) => city.id);

  it("finds a way through another city when there is no direct route", () => {
    const [best] = viaRoutes("jeju", "incheon", ids);
    expect(best.hub).toBe("seoul");
    expect(best.legs.map((leg) => leg.mode)).toEqual(["flight", "subway"]);
    expect(best.legs[0].from.en).toBe("Jeju Airport");
  });

  it("does not suggest a detour when a direct route exists", () => {
    expect(viaRoutes("seoul", "busan", ids)).toEqual([]);
  });

  it("covers every pair of map cities directly or through one other city", () => {
    const missing = ids.flatMap((a) =>
      ids.filter((b) => a !== b && transportOptions(a, b).length === 0 && viaRoutes(a, b, ids).length === 0).map((b) => `${a}-${b}`),
    );
    expect(missing).toEqual([]);
  });
});
