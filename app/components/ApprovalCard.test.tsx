import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getMessages, fmt } from "../../lib/i18n/messages";
import { getLanguage } from "../../lib/i18n/languages";

const hooks = vi.hoisted(() => ({ setters: [] as ReturnType<typeof vi.fn>[], transition: Promise.resolve() }));
const send = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

// No DOM test dependency is installed; exercise the rendered button's handler and state writes directly.
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const set = vi.fn();
    hooks.setters.push(set);
    return [initial, set];
  },
  useTransition: () => [false, (callback: () => Promise<void>) => { hooks.transition = callback(); }],
}));
vi.mock("@/app/actions", () => ({ approveAndSendAction: send, requestChangesAction: vi.fn(), retranslateAction: vi.fn() }));
vi.mock("@/lib/i18n/messages", () => import("../../lib/i18n/messages"));
vi.mock("@/lib/i18n/languages", () => import("../../lib/i18n/languages"));
vi.mock("./Toaster", () => ({ showToast: toast }));
const { ApprovalCard } = await import("./ApprovalCard");

const messages = getMessages("en");
const props = {
  requestId: "request-demo",
  draft: { subject_ko: "시연", body_ko: "시연 내용", back_translation: "Demo", hash: "draft-hash" },
  to: "team@example.test",
  facts: [],
  m: messages.approval,
  language: getLanguage("en"),
};

function clickApprove(node: ReactNode): boolean {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ className?: string; onClick?: () => void; children?: ReactNode }>(child)) continue;
    if (child.props.className === "button-approve") {
      child.props.onClick!();
      return true;
    }
    if (clickApprove(child.props.children)) return true;
  }
  return false;
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.setters = [];
  vi.useFakeTimers();
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function approve(realMail = false) {
  expect(clickApprove(ApprovalCard({ ...props, realMail }))).toBe(true);
  expect(hooks.setters[3]).toHaveBeenCalledWith(true);
  await vi.runAllTimersAsync();
  await hooks.transition;
  expect(hooks.setters[3].mock.calls).toEqual([[true], [false]]);
  expect(send).toHaveBeenCalledWith(props.requestId, { hash: props.draft.hash, to: props.to });
}

it("keeps the mock success toast explicit about the demo outbox", async () => {
  send.mockResolvedValue({ ok: true });
  await approve();
  expect(toast).toHaveBeenCalledWith(fmt(messages.approval.sentToast, { to: props.to }));
});

it("reports provider acceptance rather than mock storage or confirmed delivery for real mail", async () => {
  send.mockResolvedValue({ ok: true });
  await approve(true);
  expect(toast).toHaveBeenCalledWith(messages.sent.accepted);
  expect(toast).not.toHaveBeenCalledWith(fmt(messages.approval.sentToast, { to: props.to }));
});

it("releases the departure animation and exposes a rejected action result", async () => {
  send.mockResolvedValue({ ok: false, error: "Recipient is not allowed" });
  await approve();
  expect(hooks.setters[0]).toHaveBeenLastCalledWith("Recipient is not allowed");
  expect(toast).not.toHaveBeenCalled();
});

it("releases the departure animation and reports unknown delivery after network rejection", async () => {
  send.mockRejectedValue(new Error("Connection interrupted"));
  await approve(true);
  expect(hooks.setters[0]).toHaveBeenLastCalledWith(messages.approval.sendUnknown);
  expect(toast).not.toHaveBeenCalled();
});
