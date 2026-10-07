import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { getMessages } from "../../lib/i18n/messages";
import { LANGUAGES } from "../../lib/i18n/languages";

vi.mock("@/app/actions", () => ({}));
vi.mock("@/lib/i18n/messages", () => import("../../lib/i18n/messages"));
vi.mock("@/lib/transit/schedule-time", () => import("../../lib/transit/schedule-time"));
vi.mock("@/lib/transit/routes", () => import("../../lib/transit/routes"));
vi.mock("@/lib/transit/subway", () => import("../../lib/transit/subway"));
const { RegionalSubwayPanel } = await import("./TransitGuide");

it("부산·대구는 모든 화면 언어에서 해당 지역의 검색·지도와 공식 안내를 제공하며 수도권 경로·요금을 섞지 않는다", () => {
  for (const { code } of LANGUAGES) {
    const m = getMessages(code).transit;
    for (const region of ["busan", "daegu"] as const) {
      const html = renderToStaticMarkup(createElement(RegionalSubwayPanel, { region, language: code, m }));
      expect(html).toContain(region === "busan" ? m.regionBusan : m.regionDaegu);
      expect(html).toContain(region === "busan" ? "https://www2.humetro.busan.kr/homepage/cyberstation/mapeng.do" : "https://www.dtro.or.kr/");
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('<svg');
      expect(html).toContain('role="combobox"');
      expect(html).toContain(region === 'busan' ? 'BGL' : m.allLines);
      expect(html).not.toMatch(/\{region\}|Seoul Metro|Seoul TOPIS|transit-form|Times &amp; fares|₩/);
    }
  }
});

it("대전·광주도 각 도시의 지도와 공식 링크를 표시한다", () => {
  for (const { code } of LANGUAGES) {
    const m = getMessages(code).transit;
    for (const [region, domain, station] of [["daejeon", "www.djtc.kr", "대전"], ["gwangju", "www.grtc.co.kr", "문화전당"]] as const) {
      const html = renderToStaticMarkup(createElement(RegionalSubwayPanel, { region, language: code, m }));
      expect(html).toContain(domain);
      expect(html).toContain(station);
      expect(html).not.toMatch(/\{region\}|Seoul Metro|transit-form|₩/);
    }
  }
});
