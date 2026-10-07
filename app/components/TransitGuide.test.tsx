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
const { RegionalTransitNotice } = await import("./TransitGuide");

it("부산·대구는 모든 화면 언어에서 해당 공식 안내만 제공하며 수도권 경로·요금을 섞지 않는다", () => {
  for (const { code } of LANGUAGES) {
    const m = getMessages(code).transit;
    for (const region of ["busan", "daegu"] as const) {
      const html = renderToStaticMarkup(createElement(RegionalTransitNotice, { region, m }));
      expect(html).toContain(region === "busan" ? m.regionBusan : m.regionDaegu);
      expect(html).toContain(region === "busan" ? "https://www2.humetro.busan.kr/homepage/cyberstation/mapeng.do" : "https://www.dtro.or.kr/");
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).not.toMatch(/\{region\}|Seoul Metro|Seoul TOPIS|transit-panel|transit-map|₩/);
    }
  }
});
