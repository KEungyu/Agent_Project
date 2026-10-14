import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { getMessages } from "../../lib/i18n/messages";

const hooks = vi.hoisted(() => ({ setters: [] as ReturnType<typeof vi.fn>[], transition: Promise.resolve() }));
const send = vi.hoisted(() => vi.fn());
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => { const set = vi.fn(); hooks.setters.push(set); return [initial, set]; },
  useRef: () => ({ current: null }),
  useEffect: () => {},
  useTransition: () => [false, (callback: () => Promise<void>) => { hooks.transition = callback(); }],
}));
vi.mock("@/app/actions", () => ({ sendChat: send, externalResultsAction: vi.fn() }));
const { Chat } = await import("./Chat");

function clickExample(node: ReactNode): boolean {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ className?: string; onClick?: () => void; children?: ReactNode }>(child)) continue;
    if (child.props.className === "desk-example") { child.props.onClick!(); return true; }
    if (clickExample(child.props.children)) return true;
  }
  return false;
}

beforeEach(() => { vi.clearAllMocks(); hooks.setters = []; });

it("shows a recoverable error when a Server Action connection rejects, without losing the user's line", async () => {
  send.mockRejectedValue(new TypeError("network interrupted"));
  const m = getMessages("en");
  expect(clickExample(Chat({ initialLines: [], m: m.chat, safety: m.safety, actionsM: m.actions }))).toBe(true);
  await expect(hooks.transition).resolves.toBeUndefined();
  const lines = hooks.setters[0].mock.calls.reduce((lines, [update]) => update(lines), []);
  expect(lines).toEqual([{ role: "user", text: m.chat.examples[0] }, { role: "error", text: m.chat.unavailable }]);
});
