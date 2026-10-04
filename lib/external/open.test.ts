import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExternalAction } from "./links";
import { openExternalOnce, openedResults } from "./open";

const action = (id: string, url = "https://www.catchtable.net/", autoOpen = true): ExternalAction => ({
  kind: "external_link",
  id,
  provider: "catchtable",
  url,
  autoOpen,
  status: "site_link",
  summary: [],
  mode: "site",
});

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) });
});
afterEach(() => vi.unstubAllGlobals());

describe("외부 예약 화면 새 탭 열기 (C05·C06)", () => {
  it("C05 허용: about:blank로 열고 opener를 끊은 뒤 검증한 주소로 보낸다", () => {
    const tab = { opener: {} as unknown, location: { href: "" } };
    const open = vi.fn(() => tab);
    vi.stubGlobal("window", { open });
    expect(openExternalOnce(action("a1"))).toBe(true);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("https://www.catchtable.net/");
  });

  it("C05 차단: 열지 못하면 false를 돌려준다(성공으로 표시하지 않는다)", () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    expect(openExternalOnce(action("a2"))).toBe(false);
  });

  it("열림·막힘 결과를 남겨, 채팅이 다시 마운트돼도 같은 표시를 되살린다", () => {
    vi.stubGlobal("window", { open: vi.fn(() => ({ opener: {}, location: { href: "" } })) });
    openExternalOnce(action("b1"));
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    openExternalOnce(action("b2"));
    expect(openedResults()).toEqual({ b1: true, b2: false });
  });

  it("C06 같은 응답을 다시 그리거나 새로고침해도 다시 열지 않는다", () => {
    const open = vi.fn(() => ({ opener: {}, location: { href: "" } }));
    vi.stubGlobal("window", { open });
    openExternalOnce(action("a3"));
    expect(openExternalOnce(action("a3"))).toBeUndefined();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("검증되지 않은 주소·자동 열기 아님은 열지 않는다", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    expect(openExternalOnce(action("a4", "https://www.catchtable.net.evil.example/"))).toBeUndefined();
    expect(openExternalOnce(action("a5", "javascript:alert(1)"))).toBeUndefined();
    expect(openExternalOnce(action("a6", "https://www.catchtable.net/", false))).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });
});
