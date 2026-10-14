import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ message: { text: "" } as { text: string; boardId?: string }, transition: Promise.resolve() }));
const load = vi.hoisted(() => vi.fn());
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => [hooks.message, (value: typeof hooks.message) => { hooks.message = value; }],
  useRef: () => ({ current: false }),
  useTransition: () => [false, (callback: () => Promise<void>) => { hooks.transition = callback(); }],
}));
vi.mock("@/app/actions", () => ({ loadDemoAction: load }));
const { DemoLoader } = await import("./DemoLoader");

function children(boardId: string) {
  return Children.toArray(DemoLoader({ boardId, realMail: true }).props.children).filter(isValidElement<{ role?: string; onClick?: () => void; children?: ReactNode }>);
}

beforeEach(() => { vi.clearAllMocks(); hooks.message = { text: "" }; });

it("shows load success only for the board that the server actually loaded", async () => {
  load.mockResolvedValue({ ok: true, boardId: "loaded" });
  children("previous").find((child) => child.type === "button")!.props.onClick!();
  await hooks.transition;
  expect(load).toHaveBeenCalledWith("previous");
  expect(children("loaded").find((child) => child.props.role === "status")!.props.children).toContain("시연 준비 완료");
  expect(children("empty").find((child) => child.props.role === "status")!.props.children).toBe("");
});
