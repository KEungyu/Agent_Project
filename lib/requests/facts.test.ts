import { describe, expect, it } from "vitest";
import { getMessages } from "../i18n/messages";
import { requestFacts } from "./facts";

describe("requestFacts", () => {
  const slots = { check_in_date: "2026-10-09", expected_arrival: "2026-10-10T01:00+09:00", check_out_date: "2026-10-11" };

  it("체크인·숙소 도착·체크아웃을 각각 연도와 KST까지 보여주고, 서로 섞지 않는다", () => {
    const facts = requestFacts(slots, "en", getMessages("en").approval);
    expect(facts.map((fact) => fact.value)).toEqual(["Fri, Oct 9, 2026", "Sat, Oct 10, 2026, 01:00 KST", "Sun, Oct 11, 2026"]);
  });

  it("이용자 언어 형식으로 쓴다", () => {
    const [, arrival] = requestFacts(slots, "ja", getMessages("ja").approval);
    expect(arrival.label).toBe("宿への到着");
    expect(arrival.value).toContain("2026");
    expect(arrival.value).toContain("01:00 KST");
  });
});

describe("requestFacts — 연도", () => {
  it("태국어에서도 한국어 원문과 같은 서력 연도를 쓴다", () => {
    const [checkIn] = requestFacts({ check_in_date: "2026-10-09" }, "th", getMessages("th").approval);
    expect(checkIn.value).toContain("2026");
    expect(checkIn.value).not.toContain("2569");
  });
});
