import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { getMessages } from "../../lib/i18n/messages";

const reset = vi.hoisted(() => vi.fn());
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: () => ({ current: null }),
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
}));
vi.mock("@/app/actions", () => ({ startNewTripAction: reset }));
const { EntryIntro } = await import("./EntryIntro");

function clickEntry(node: ReactNode): boolean {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ className?: string; onClick?: () => void; children?: ReactNode }>(child)) continue;
    if (child.props.className === "button intro-enter") {
      child.props.onClick!();
      return true;
    }
    if (clickEntry(child.props.children)) return true;
  }
  return false;
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("entering or replaying the intro leaves an existing presentation board intact", () => {
  vi.useFakeTimers();
  const setItem = vi.fn();
  vi.stubGlobal("sessionStorage", { setItem });
  const tree = EntryIntro({ m: getMessages("en").intro, ko: getMessages("ko").intro, language: "en", stamp: { date: "2026.10.19", airport: "ICN" }, hasTrip: true });
  expect(clickEntry(tree)).toBe(true);
  expect(setItem).toHaveBeenCalledWith("majungi-intro-seen", "1");
  expect(reset).not.toHaveBeenCalled();
});
