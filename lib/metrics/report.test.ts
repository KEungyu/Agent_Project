import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { getBoard, recordEvent } from "../board/store";
import { openDb } from "../db/client";
import { createMockMailer } from "../mail/mailer";
import { approveAndSend, currentVersion } from "../requests/approval";
import { hashDraft } from "../requests/drafting";
import { addReply, confirmReplyClass } from "../requests/replies";
import { getRequest, createRequest, transition } from "../requests/state";
import { boardReport } from "./report";

describe("전/후 지표", () => {
  it("F2-26 실측·요청 0건이면 평균을 0분 성과로 만들지 않는다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const report = boardReport(db, board.id, []);
    expect(report.outcomes).toEqual({ done: 0, conditional: 0, declined: 0 });
    expect(report.after).toMatchObject({ steps: null, activeMinutes: null, toolSwitches: null, reAsks: null, replies: 0 });
    expect(report.rows).toEqual([]);
  });
  it("완료된 요청의 이용자 조작 수, 재질문, 회신 확인을 계산한다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    recordEvent(db, board.id, "user_action", { action: "chat" }); // "호텔에 늦게 도착한다고 알려 줘"
    const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: {} }, "agent");
    const draft = { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") };
    transition(db, request.id, "pending_approval", "agent", { patch: { draft } });
    await approveAndSend(db, request.id, createMockMailer(`/tmp/majung-metrics-${Date.now()}`), currentVersion(db, getRequest(db, request.id)!)!); // 승인 1회
    const reply = addReply(db, request.id, "늦은 체크인 가능합니다."); // 회신 붙여넣기 1회
    confirmReplyClass(db, reply.id, "done"); // 직접 분류 1회

    const { rows, after } = boardReport(db, board.id, getBoard(db, board.id)!.requests);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "done", steps: 4, reAsks: 0, toolSwitches: 0, replyNeededUser: true });
    expect(after).toMatchObject({ steps: 4, reAsks: 0, repliesNeedingUser: 1, replies: 1 });
  });

  it("F2-17 조건 충족 전·거절 건은 해결 건수에 넣지 않는다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const sentWithReply = async (text: string, cls: "done" | "conditional" | "declined") => {
      const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: {} }, "agent");
      transition(db, request.id, "pending_approval", "agent", { patch: { draft: { subject_ko: "s", body_ko: text, back_translation: "t", hash: hashDraft("s", text) } } });
      await approveAndSend(db, request.id, createMockMailer(`/tmp/majung-metrics-${Date.now()}-${cls}`), currentVersion(db, getRequest(db, request.id)!)!);
      confirmReplyClass(db, addReply(db, request.id, text).id, cls);
    };
    await sentWithReply("가능합니다.", "done");
    await sentWithReply("22시까지 온라인 체크인하시면 가능합니다.", "conditional");
    await sentWithReply("불가능합니다.", "declined");
    const { rows, outcomes } = boardReport(db, board.id, getBoard(db, board.id)!.requests);
    expect(rows).toHaveLength(3);
    expect(outcomes).toEqual({ done: 1, conditional: 1, declined: 1 });
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
