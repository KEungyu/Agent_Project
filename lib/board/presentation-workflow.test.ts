import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConversation } from "../agent/conversation";
import { fakeLlm, message, schemaHas, toolUse } from "../agent/testing";
import { runTurn } from "../agent/turn";
import { openDb, type Db } from "../db/client";
import { createMockMailer, createRealMailer } from "../mail/mailer";
import { loadRequestTypes } from "../request-types/loader";
import { approveAndSend, currentVersion, sendApproved } from "../requests/approval";
import { draftFacts } from "../requests/drafting";
import { addReply, applyInterpretation, getLatestReply, interpretReply } from "../requests/replies";
import { getHistory, getRequest, transition, TransitionError } from "../requests/state";
import { loadPresentationDemo } from "./demo";
import { getBoard, getCurrentBoard, listEvents } from "./store";

let db: Db;
let outbox: string;
beforeEach(() => {
  db = openDb(":memory:");
  outbox = mkdtempSync(path.join(tmpdir(), "majungi-presentation-outbox-"));
  vi.stubEnv("MAIL_MODE", "mock");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-13T06:30:00Z"));
});
afterEach(() => {
  db.$client.close();
  rmSync(outbox, { recursive: true, force: true });
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("presentation workflow with scripted LLM and fake HTTP (not live AI or external email)", () => {
  it.each(["mock", "real"] as const)("%s mode: drafts from loaded data, waits for approval, sends once, interprets a conditional reply and preserves the rehearsal", async (mode) => {
    const env = { MAIL_MODE: mode, RESEND_API_KEY: "test-key", MAIL_FROM: "demo-sender@example.org", MAIL_ALLOWLIST: "demo-team@example.org" };
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const recipient = mode === "mock" ? "front@majungi-demo.test" : env.MAIL_ALLOWLIST;
    const doFetch = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ id: "re_demo_receipt" }), { status: 200 }));
    const mailer = mode === "mock" ? createMockMailer(outbox) : createRealMailer(env, doFetch);
    const board = loadPresentationDemo(db, null);
    expect(board.stays[0].email).toBe(recipient);
    expect(doFetch).not.toHaveBeenCalled();
    const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;
    const deadline = "Complete online check-in by 22:00 KST on October 19, 2026.";
    const replyText = "안녕하세요, Emma Smith 고객님. 예약번호 DEMO-20261019의 10월 19일 체크인 예약을 확인했습니다. 10월 19일 22시까지 온라인 체크인을 완료하시면 10월 20일 오전 1시 30분에 입실하실 수 있습니다. 온라인 체크인 완료 후 출입 방법을 안내드리겠습니다.";
    const llm = fakeLlm([
      message([toolUse("board", "board_get")], "tool_use"),
      message([toolUse("conditions", "check_conditions", { type_id: type.id })], "tool_use"),
      message([toolUse("draft", "draft_request", { type_id: type.id })], "tool_use"),
    ], (request) => {
      if (schemaHas(request, "coverage")) {
        const facts = JSON.parse(request.prompt.replace("Facts (JSON): ", ""));
        expect(facts).toMatchObject({ booking_ref: "DEMO-20261019", check_in_date: "2026-10-19", expected_arrival: "2026-10-20T01:30+09:00" });
        return {
          subject_ko: "늦은 체크인 문의 (DEMO-20261019)",
          body_ko: `예약자명 ${facts.guest_name}, 예약번호 ${facts.booking_ref}. 체크인 날짜 ${facts.check_in_date_ko}, 도착 예정 시각 ${facts.expected_arrival_ko}. 늦은 체크인 가능 여부와 프런트 마감 후 출입 방법 문의드립니다.`,
          coverage: type.message_guidelines.must_include.map((item) => ({ item, quote: item })),
        };
      }
      if (schemaHas(request, "class")) {
        expect(request.prompt).toContain(replyText);
        expect(request.prompt).toContain("2026-10-20T01:30+09:00");
        return {
          class: "conditional", conditions: [deadline], requested_info: [],
          summary: "Late check-in at 01:30 KST on October 20, 2026 is accepted if online check-in is completed by the deadline.",
          confidence: 0.98, answers_request: true, matches_requested_time: true,
          refuses_requested_time: false, contradictory: false, uncertain: false,
        };
      }
      expect(request.prompt).toContain("DEMO-20261019");
      return {
        subject: "Late check-in inquiry (DEMO-20261019)",
        body: "Guest Emma Smith, booking DEMO-20261019. Check-in date: October 19, 2026. Expected hotel arrival: October 20, 2026 at 01:30 KST. Please advise whether late check-in is possible and how to enter after the front desk closes.",
      };
    });

    const turn = await runTurn({ db, boardId: board.id, language: "en", text: "Please ask my hotel about late check-in using my saved booking details. Show me the draft before sending.", createLlm: () => llm });
    expect(turn).toMatchObject({ ok: true, tools: [{ name: "board_get", ok: true }, { name: "check_conditions", ok: true }, { name: "draft_request", ok: true }] });
    const requests = getBoard(db, board.id)!.requests;
    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request).toMatchObject({ status: "pending_approval", channel: "email", target_id: board.stays[0].id, slots: { guest_name: "Emma Smith", booking_ref: "DEMO-20261019", check_in_date: "2026-10-19", expected_arrival: "2026-10-20T01:30+09:00" } });
    expect(request.draft?.body_ko).toContain("2026년 10월 19일");
    expect(request.draft?.body_ko).toContain("2026년 10월 20일");
    expect(request.draft?.body_ko).toContain("01:30(KST)");
    expect(request.draft?.back_translation).toContain("01:30 KST");
    expect(request.sent).toBeUndefined();
    expect(readdirSync(outbox)).toEqual([]);
    expect(doFetch).not.toHaveBeenCalled();

    await expect(sendApproved(db, request.id, mailer)).rejects.toThrow();
    expect(readdirSync(outbox)).toEqual([]);
    expect(doFetch).not.toHaveBeenCalled();
    const approved = await approveAndSend(db, request.id, mailer, currentVersion(db, request)!);
    expect(approved).toMatchObject({ status: "awaiting_reply", sent: { mode, to: recipient } });
    if (mode === "mock") {
      expect(doFetch).not.toHaveBeenCalled();
      expect(readdirSync(outbox)).toHaveLength(1);
      const delivered = JSON.parse(readFileSync(path.join(outbox, readdirSync(outbox)[0]), "utf8"));
      expect(delivered).toMatchObject({ to: recipient, subject: request.draft!.subject_ko, body: request.draft!.body_ko, message_id: approved.sent!.message_id });
    } else {
      expect(readdirSync(outbox)).toEqual([]);
      expect(doFetch).toHaveBeenCalledTimes(1);
      const [url, init] = doFetch.mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ from: env.MAIL_FROM, to: [recipient], subject: request.draft!.subject_ko, text: request.draft!.body_ko });
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(`${request.id}:${approved.approval!.draft_hash}`);
      expect(approved.sent!.message_id).toBe("re_demo_receipt");
    }

    const reply = addReply(db, request.id, replyText);
    const interpretation = await interpretReply(llm, type, reply.raw_ko, "en", draftFacts(request.slots));
    expect(interpretation).toMatchObject({ class: "conditional", conditions: [deadline], needs_user_check: false });
    expect(applyInterpretation(db, reply, interpretation).status).toBe("conditional");
    expect(() => transition(db, request.id, "done", "user")).toThrow(TransitionError);
    expect(() => transition(db, request.id, "done", "user", { conditionConfirmation: { replyId: reply.id, fulfilled: false, deadlineMet: true } })).toThrow(TransitionError);
    expect(getRequest(db, request.id)?.status).toBe("conditional");
    expect(getHistory(db, request.id).map((entry) => entry.to)).toEqual(["draft", "pending_approval", "sent", "awaiting_reply", "conditional"]);
    expect(readdirSync(outbox)).toHaveLength(mode === "mock" ? 1 : 0);
    expect(doFetch).toHaveBeenCalledTimes(mode === "mock" ? 0 : 1);
    expect(llm.structured).toHaveBeenCalledTimes(3);

    const previous = getBoard(db, board.id);
    const events = listEvents(db, board.id);
    const savedReply = getLatestReply(db, request.id);
    const conversation = structuredClone(getConversation(board.id));
    expect(conversation.length).toBeGreaterThan(0);
    const fresh = loadPresentationDemo(db, board.id);
    expect(getCurrentBoard(db)?.id).toBe(fresh.id);
    expect(fresh.requests).toEqual([]);
    expect(getConversation(fresh.id)).toEqual([]);
    expect(getBoard(db, board.id)).toEqual(previous);
    expect(listEvents(db, board.id)).toEqual(events);
    expect(getLatestReply(db, request.id)).toEqual(savedReply);
    expect(getConversation(board.id)).toEqual(conversation);
  });
});
