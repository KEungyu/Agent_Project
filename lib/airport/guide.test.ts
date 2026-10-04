import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../i18n/languages";
import { AIRPORT_TRANSPORT, FACILITIES, FLIGHT_INFO, SOURCES, facilitiesFor, stepsFor } from "./guide";

const en = (steps: { text: { en: string } }[]) => steps.map((step) => step.text.en);

describe("공항 단계별 안내", () => {
  it("A01 인천 국제선 도착: 검역 → 입국 심사 → 짐 찾기 → 입국장 순서", () => {
    const steps = en(stepsFor("ICN", "T1", "arrival"));
    const at = (word: string) => steps.findIndex((text) => text.includes(word));
    expect(at("Quarantine")).toBeLessThan(at("Immigration"));
    expect(at("Immigration")).toBeLessThan(at("Baggage claim"));
    expect(at("Baggage claim")).toBeLessThan(at("arrival hall"));
    expect(stepsFor("ICN", "T1", "arrival").every((step) => step.source === SOURCES.icnArrival)).toBe(true);
  });

  it("A02 인천 국제선 출발: 체크인 → 보안검색 → 출국 심사(되돌아올 수 없음) → 탑승구", () => {
    const steps = en(stepsFor("ICN", "T2", "departure"));
    const at = (word: string) => steps.findIndex((text) => text.includes(word));
    expect(at("Check in")).toBeLessThan(at("Security"));
    expect(at("Security")).toBeLessThan(at("Departure immigration"));
    expect(steps[at("Departure immigration")]).toContain("can't go back");
    expect(at("Departure immigration")).toBeLessThan(at("gate"));
  });

  it("A08 국내선은 입국·출국 심사 단계가 없다", () => {
    for (const stage of ["arrival", "departure"] as const) {
      const steps = en(stepsFor("GMP", "domestic", stage));
      expect(steps.join(" ")).toMatch(/No immigration/);
      expect(steps.some((text) => /^(Departure )?[Ii]mmigration/.test(text))).toBe(false);
    }
  });

  it("김포 국제선은 확인하지 못한 층 정보를 빼고 공식 사이트 확인을 덧붙인다", () => {
    const steps = stepsFor("GMP", "international", "arrival");
    expect(steps[0].note?.en).toMatch(/weren't confirmed/);
    expect(steps.every((step) => !step.source)).toBe(true);
  });

  it("환승 안내는 인천만 있고, 연결편 탑승을 보장하지 않는다", () => {
    expect(stepsFor("GMP", "international", "transfer")).toEqual([]);
    expect(stepsFor("ICN", "T1", "transfer").some((step) => step.note?.en.includes("can't guarantee"))).toBe(true);
  });

  it("A03 시설은 출처가 있고, 확인하지 못한 터미널은 비워 둔다", () => {
    for (const facility of FACILITIES) expect(facility.source.checkedAt).toBe("2026-10-04");
    expect(facilitiesFor("ICN", "T2", "arrival")).toEqual([]);
    const gmpSim = facilitiesFor("GMP", "international", "arrival").find((facility) => facility.kind === "sim");
    expect(gmpSim?.hours).toBeUndefined(); // 운영시간 미확인
    expect(facilitiesFor("ICN", "T1", "arrival").map((facility) => facility.name)).toContain("KB Bank Currency Exchange");
  });

  it("모든 문구는 9개 언어로 비어 있지 않다", () => {
    const texts = [
      ...(["arrival", "departure", "transfer"] as const).flatMap((stage) => [
        ...stepsFor("ICN", "T1", stage),
        ...stepsFor("GMP", "international", stage),
        ...stepsFor("GMP", "domestic", stage),
      ]).flatMap((step) => [step.text, ...(step.note ? [step.note] : [])]),
      ...FACILITIES.map((facility) => facility.where),
      ...Object.values(AIRPORT_TRANSPORT).flat().map((fact) => fact.text),
    ];
    for (const text of texts) for (const { code } of LANGUAGES) expect(text[code]?.trim()).toBeTruthy();
  });

  it("출처와 운항 정보 링크는 https 공식 공항 도메인만 쓴다", () => {
    const urls = [...Object.values(SOURCES), ...Object.values(FLIGHT_INFO)].map((source) => new URL(source.url));
    for (const url of urls) {
      expect(url.protocol).toBe("https:");
      expect(["www.airport.kr", "www.airport.co.kr"]).toContain(url.hostname);
    }
  });
});
