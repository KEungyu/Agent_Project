import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import type { ReplyClass } from "../board/types";
import { openDb } from "../db/client";
import { getMessages } from "../i18n/messages";
import { hashDraft } from "./drafting";
import { prepareFollowUp } from "./followup";
import { addReply, applyInterpretation } from "./replies";
import { createRequest, transition, TransitionError } from "./state";

const m = getMessages("en");
const context = { m, where: "Hotel Example Myeongdong", typeLabel: "Late check-in inquiry" };

function answered(cls: ReplyClass, extra: { conditions?: string[]; requested_info?: string[] } = {}) {
  const db = openDb(":memory:");
  const board = seedDemoBoard(db);
  const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: {} }, "agent");
  const draft = { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") };
  transition(db, request.id, "pending_approval", "agent", { patch: { draft } });
  transition(db, request.id, "sent", "system", {
    patch: {
      approval: { approved_at: "2026-10-18T10:00:00Z", approved_by: "user", draft_hash: draft.hash },
      sent: { at: "2026-10-18T10:00:05Z", message_id: "mock-1", mode: "mock", to: "front@hotel-example.test" },
    },
  });
  transition(db, request.id, "awaiting_reply", "system");
  const reply = addReply(db, request.id, "회신");
  applyInterpretation(db, reply, {
    class: cls,
    conditions: extra.conditions ?? [],
    requested_info: extra.requested_info ?? [],
    summary: "",
    confidence: 0.9,
    needs_user_check: false,
  });
  return { db, requestId: request.id };
}

describe("follow-ups", () => {
  it("조건 수락은 바로 완료되고 마중에게 보낼 요청이 없다", () => {
    const { db, requestId } = answered("conditional", { conditions: ["Door code by email"] });
    const { request, prompt } = prepareFollowUp(db, requestId, "accept", context);
    expect(request.status).toBe("done");
    expect(prompt).toBeUndefined();
  });

  it("조건부 수락에 답장하면 2회차 초안이 되고 조건이 요청 문장에 들어간다", () => {
    const { db, requestId } = answered("conditional", { conditions: ["Door code by email", "10,000 won fee"] });
    const { request, prompt } = prepareFollowUp(db, requestId, "reply", context);
    expect(request).toMatchObject({ status: "draft", round: 2 });
    expect(prompt).toContain("Door code by email, 10,000 won fee");
    expect(prompt).toContain("Hotel Example Myeongdong");
  });

  it("추가 정보 요청에는 요청받은 정보를 담은 후속 요청을 준비한다", () => {
    const { db, requestId } = answered("info_requested", { requested_info: ["Flight number", "Phone number"] });
    const { request, prompt } = prepareFollowUp(db, requestId, "provide_info", context);
    expect(request).toMatchObject({ status: "draft", round: 2 });
    expect(prompt).toContain("Flight number, Phone number");
  });

  it("거절은 상태를 두고 전화 스크립트나 대안을 요청한다", () => {
    const { db, requestId } = answered("declined");
    const { request, prompt } = prepareFollowUp(db, requestId, "phone", context);
    expect(request.status).toBe("declined");
    expect(prompt).toContain("phone script");
  });

  it("상태에 맞지 않는 후속 조치는 거부한다", () => {
    const { db, requestId } = answered("done");
    expect(() => prepareFollowUp(db, requestId, "reply", context)).toThrow(TransitionError);
  });
});
