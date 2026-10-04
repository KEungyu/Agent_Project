import { describe, expect, it } from "vitest";
import { EXTERNAL_PROVIDERS, isExternalAction, safeExternalUrl } from "./links";

describe("safeExternalUrl", () => {
  it("공식 HTTPS 주소만 허용한다", () => {
    expect(safeExternalUrl("https://www.catchtable.net/", "catchtable")).toBe("https://www.catchtable.net/");
    expect(safeExternalUrl("https://www.booking.com/", "booking")).toBe("https://www.booking.com/");
  });

  it.each([
    ["https://www.booking.com.evil.example/", "booking"],
    ["https://evil.example/?u=https://www.booking.com/", "booking"],
    ["http://www.booking.com/", "booking"],
    ["javascript:alert(1)", "booking"],
    ["https://user:pass@www.booking.com/", "booking"],
    ["https://www.catchtable.co.kr/", "catchtable"],
    ["https://www.booking.com/", "catchtable"],
    ["not a url", "catchtable"],
  ] as const)("%s (%s) 는 거부한다", (url, provider) => {
    expect(safeExternalUrl(url, provider)).toBeNull();
  });

  it("행동 객체도 같은 검사를 거친다", () => {
    const action = { kind: "external_link", id: "t1", provider: "catchtable", url: EXTERNAL_PROVIDERS.catchtable.home, autoOpen: true, status: "site_link", summary: [] };
    expect(isExternalAction(action)).toBe(true);
    expect(isExternalAction({ ...action, url: "https://www.catchtable.net.evil.example/" })).toBe(false);
  });
});
