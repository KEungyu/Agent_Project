import { describe, expect, it } from "vitest";
import { transportOptions } from "./routes";

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
