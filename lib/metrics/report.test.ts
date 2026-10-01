import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { getBoard, recordEvent } from "../board/store";
import { openDb } from "../db/client";
import { createMockMailer } from "../mail/mailer";
import { approveAndSend } from "../requests/approval";
import { hashDraft } from "../requests/drafting";
import { addReply, confirmReplyClass } from "../requests/replies";
import { createRequest, transition } from "../requests/state";
import { boardReport } from "./report";

describe("전/후 지표", () => {
  it("완료된 요청의 이용자 조작 수, 재질문, 회신 확인을 계산한다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    recordEvent(db, board.id, "user_action", { action: "chat" }); // "호텔에 늦게 도착한다고 알려 줘"
    const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: {} }, "agent");
    const draft = { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") };
    transition(db, request.id, "pending_approval", "agent", { patch: { draft } });
    approveAndSend(db, request.id, createMockMailer(`/tmp/majung-metrics-${Date.now()}`)); // 승인 1회
    const reply = addReply(db, request.id, "늦은 체크인 가능합니다."); // 회신 붙여넣기 1회
    confirmReplyClass(db, reply.id, "done"); // 직접 분류 1회

    const { rows, after } = boardReport(db, board.id, getBoard(db, board.id)!.requests);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "done", steps: 4, reAsks: 0, toolSwitches: 0, replyNeededUser: true });
    expect(after).toMatchObject({ steps: 4, reAsks: 0, repliesNeedingUser: 1, replies: 1 });
  });

  it("진행 중인 요청은 계산하지 않는다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    createRequest(db, { boardId: board.id, typeId: "late_checkin", slots: {} }, "agent");
    const { rows, after } = boardReport(db, board.id, getBoard(db, board.id)!.requests);
    expect(rows).toEqual([]);
    expect(after.steps).toBeNull();
  });
});
