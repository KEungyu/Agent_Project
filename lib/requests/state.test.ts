import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { listEvents } from "../board/store";
import type { Interpretation, ReplyClass } from "../board/types";
import { openDb } from "../db/client";
import { replies } from "../db/schema";
import { createRequest, getHistory, transition, TransitionError } from "./state";

const DRAFT = { subject_ko: "늦은 체크인 문의", body_ko: "안녕하세요...", back_translation: "Hello...", hash: "h1" };
const APPROVAL = { approved_at: "2026-10-18T10:00:00Z", approved_by: "user" as const, draft_hash: "h1" };
const SENT = { at: "2026-10-18T10:00:05Z", message_id: "mock-1", mode: "mock" as const, to: "front@hotel-example.test" };

function setup() {
  const db = openDb(":memory:");
  const board = seedDemoBoard(db);
  const request = createRequest(
    db,
    { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: { booking_ref: "BK123456" } },
    "agent",
  );
  return { db, board, request };
}

function addReply(db: ReturnType<typeof openDb>, requestId: string, cls: ReplyClass, confidence: number) {
  const interpretation: Interpretation = {
    class: cls,
    conditions: [],
    requested_info: [],
    summary: "",
    confidence,
    needs_user_check: confidence < 0.7,
  };
  db.insert(replies)
    .values({ id: `rep_${Math.random()}`, request_id: requestId, received_at: new Date().toISOString(), raw_ko: "회신", interpretation })
    .run();
}

// 초안 → 승인 대기 → 발송됨 → 회신 대기
function toAwaitingReply(db: ReturnType<typeof openDb>, requestId: string) {
  transition(db, requestId, "pending_approval", "agent", { patch: { draft: DRAFT } });
  transition(db, requestId, "sent", "system", { patch: { approval: APPROVAL, sent: SENT } });
  return transition(db, requestId, "awaiting_reply", "system");
}

describe("request state machine", () => {
  it("허용된 전이로 회신 대기까지 진행하고, 회신 분류 4가지로 각각 갈 수 있다", () => {
    for (const cls of ["done", "conditional", "declined", "info_requested"] as const) {
      const { db, request } = setup();
      expect(toAwaitingReply(db, request.id).status).toBe("awaiting_reply");
      addReply(db, request.id, cls, 0.9);
      expect(transition(db, request.id, cls, "agent").status).toBe(cls);
    }
  });

  it("승인 대기에서 이용자가 수정을 요청하면 초안으로 돌아간다", () => {
    const { db, request } = setup();
    transition(db, request.id, "pending_approval", "agent", { patch: { draft: DRAFT } });
    expect(transition(db, request.id, "draft", "user").status).toBe("draft");
  });

  it("조건부 수락은 이용자가 수락하면 완료, 답신을 고르면 새 라운드 초안이 된다", () => {
    const accept = setup();
    toAwaitingReply(accept.db, accept.request.id);
    addReply(accept.db, accept.request.id, "conditional", 0.9);
    transition(accept.db, accept.request.id, "conditional", "agent");
    expect(transition(accept.db, accept.request.id, "done", "user").status).toBe("done");

    const reply = setup();
    toAwaitingReply(reply.db, reply.request.id);
    addReply(reply.db, reply.request.id, "conditional", 0.9);
    transition(reply.db, reply.request.id, "conditional", "agent");
    const next = transition(reply.db, reply.request.id, "draft", "user");
    expect(next).toMatchObject({ status: "draft", round: 2 });
    expect(next.approval).toBeUndefined();
    expect(next.sent).toBeUndefined();
  });

  it("추가 정보 요청은 에이전트가 후속 초안(round 2)으로 넘긴다", () => {
    const { db, request } = setup();
    toAwaitingReply(db, request.id);
    addReply(db, request.id, "info_requested", 0.9);
    transition(db, request.id, "info_requested", "agent");
    expect(transition(db, request.id, "draft", "agent")).toMatchObject({ status: "draft", round: 2 });
  });

  it("표에 없는 전이(초안 → 발송됨)는 거부하고 오류를 기록한다", () => {
    const { db, board, request } = setup();
    expect(() => transition(db, request.id, "sent", "system")).toThrow(TransitionError);
    const rejected = listEvents(db, board.id).filter((event) => event.kind === "transition_rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0].detail).toMatchObject({ from: "draft", to: "sent" });
  });

  it("행위자 제한: 에이전트는 승인 대기를 초안으로 돌리거나 발송 상태로 넘길 수 없다", () => {
    const { db, request } = setup();
    transition(db, request.id, "pending_approval", "agent", { patch: { draft: DRAFT } });
    expect(() => transition(db, request.id, "draft", "agent")).toThrow(/행위자/);
    expect(() => transition(db, request.id, "sent", "agent", { patch: { approval: APPROVAL, sent: SENT } })).toThrow(/행위자/);
  });

  it("승인 없이, 또는 승인 후 본문이 바뀐 채로는 발송됨이 될 수 없다", () => {
    const { db, request } = setup();
    transition(db, request.id, "pending_approval", "agent", { patch: { draft: DRAFT } });
    expect(() => transition(db, request.id, "sent", "system", { patch: { sent: SENT } })).toThrow(/승인이 없다/);
    expect(() =>
      transition(db, request.id, "sent", "system", { patch: { approval: { ...APPROVAL, draft_hash: "old" }, sent: SENT } }),
    ).toThrow(/재승인/);
  });

  it("해석 신뢰도가 0.7 미만이면 에이전트는 분류할 수 없고, 이용자 확인으로만 넘어간다", () => {
    const { db, request } = setup();
    toAwaitingReply(db, request.id);
    addReply(db, request.id, "conditional", 0.5);
    expect(() => transition(db, request.id, "conditional", "agent")).toThrow(/이용자 확인 필요/);
    expect(transition(db, request.id, "conditional", "user").status).toBe("conditional");
  });

  it("모든 전이가 시각과 행위자와 함께 이력에 남는다", () => {
    const { db, request } = setup();
    toAwaitingReply(db, request.id);
    addReply(db, request.id, "done", 0.95);
    transition(db, request.id, "done", "agent");

    const history = getHistory(db, request.id);
    expect(history.map((entry) => `${entry.from ?? "∅"}→${entry.to}:${entry.actor}`)).toEqual([
      "∅→draft:agent",
      "draft→pending_approval:agent",
      "pending_approval→sent:system",
      "sent→awaiting_reply:system",
      "awaiting_reply→done:agent",
    ]);
    expect(history.every((entry) => !Number.isNaN(Date.parse(entry.at)))).toBe(true);
  });
});
