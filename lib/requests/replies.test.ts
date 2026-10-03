import { describe, expect, it } from "vitest";
import { fakeLlm } from "../agent/testing";
import { seedDemoBoard } from "../board/demo";
import { openDb } from "../db/client";
import { loadRequestTypes } from "../request-types/loader";
import { hashDraft } from "./drafting";
import { addReply, applyInterpretation, confirmReplyClass, getLatestReply, interpretReply } from "./replies";
import { createRequest, getHistory, transition, TransitionError } from "./state";

const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;

function awaitingReply() {
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
  return { db, requestId: request.id };
}

const interpretation = (cls: "done" | "conditional", confidence: number) => ({
  class: cls,
  conditions: cls === "conditional" ? ["Door code arrives by email on the day"] : [],
  requested_info: [],
  summary: "Late check-in is OK.",
  confidence,
  needs_user_check: confidence < 0.7,
});

describe("replies", () => {
  it("회신 대기 중이 아니면 회신을 받지 않는다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", slots: {} }, "agent");
    expect(() => addReply(db, request.id, "안녕하세요")).toThrow(TransitionError);
  });

  it("신뢰도가 충분하면 에이전트가 분류대로 상태를 바꾼다", () => {
    const { db, requestId } = awaitingReply();
    const reply = addReply(db, requestId, "늦은 체크인은 가능하지만 도어락 비밀번호를 메일로 보내 드립니다.");
    expect(applyInterpretation(db, reply, interpretation("conditional", 0.92)).status).toBe("conditional");
    expect(getLatestReply(db, requestId)!.interpretation!.conditions).toEqual(["Door code arrives by email on the day"]);
    expect(getHistory(db, requestId).at(-1)).toMatchObject({ to: "conditional", actor: "agent" });
  });

  it("신뢰도가 낮으면 상태를 바꾸지 않고 이용자 확인을 기다린다", () => {
    const { db, requestId } = awaitingReply();
    const reply = addReply(db, requestId, "모호한 회신");
    expect(applyInterpretation(db, reply, interpretation("done", 0.5)).status).toBe("awaiting_reply");
    expect(getLatestReply(db, requestId)!.interpretation!.needs_user_check).toBe(true);
  });

  it("LLM 없이도 이용자가 직접 분류해 진행할 수 있다", () => {
    const { db, requestId } = awaitingReply();
    const reply = addReply(db, requestId, "죄송하지만 자정 이후 체크인은 불가합니다.");
    const request = confirmReplyClass(db, reply.id, "declined");
    expect(request.status).toBe("declined");
    expect(getLatestReply(db, requestId)!.interpretation).toMatchObject({ class: "declined", confirmed_by_user: true });
    expect(getHistory(db, requestId).at(-1)).toMatchObject({ to: "declined", actor: "user" });
  });

  it("해석은 이용자 언어로 요청하고, 신뢰도로 확인 필요 여부를 정한다", async () => {
    const systems: string[] = [];
    const llm = fakeLlm([], (request) => {
      systems.push(request.system);
      return { class: "done", conditions: [], requested_info: [], summary: "OK", confidence: 0.55 };
    });
    const result = await interpretReply(llm, type, "괜찮습니다", "vi");
    expect(systems[0]).toContain("written in Vietnamese");
    expect(result.needs_user_check).toBe(true);
  });

  it("운영시간 안내·다른 날짜·상충·확답 없음은 신뢰도가 높아도 이용자 확인으로 넘긴다", async () => {
    const answer = (flags: object) =>
      fakeLlm([], () => ({ class: "done", conditions: [], requested_info: [], summary: "…", confidence: 0.95, answers_request: true, matches_requested_time: true, contradictory: false, uncertain: false, ...flags }));
    expect((await interpretReply(answer({}), type, "가능합니다", "en")).needs_user_check).toBe(false);
    for (const flags of [{ answers_request: false }, { matches_requested_time: false }, { contradictory: true }, { uncertain: true }]) {
      const result = await interpretReply(answer(flags), type, "…", "en");
      expect(result.needs_user_check).toBe(true);
      expect(result).not.toHaveProperty("contradictory");
    }
  });
});
