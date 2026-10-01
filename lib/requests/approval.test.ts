import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { listEvents } from "../board/store";
import { openDb } from "../db/client";
import { createMockMailer, getMailer } from "../mail/mailer";
import { fakeLlm } from "../agent/testing";
import { approveAndSend, approveRequest, requestChanges, retranslateDraft, sendApproved } from "./approval";
import { hashDraft } from "./drafting";
import { createRequest, getHistory, getRequest, transition } from "./state";

const SUBJECT = "늦은 체크인 문의";
const BODY = "예약자명 Emma Smith, 예약번호 BK123456 ...";

let outbox: string;
afterEach(() => {
  rmSync(outbox, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function setup() {
  outbox = mkdtempSync(path.join(tmpdir(), "majung-outbox-"));
  const db = openDb(":memory:");
  const board = seedDemoBoard(db);
  const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: board.stays[0].id, slots: {} }, "agent");
  const draft = { subject_ko: SUBJECT, body_ko: BODY, back_translation: "Subject: Late check-in", hash: hashDraft(SUBJECT, BODY) };
  transition(db, request.id, "pending_approval", "agent", { patch: { draft } });
  return { db, boardId: board.id, requestId: request.id, mailer: createMockMailer(outbox) };
}

const outboxFiles = () => readdirSync(outbox);

describe("approval gate", () => {
  it("승인 없이 발송하면 거부되고 승인 대기로 남으며 아무것도 보내지 않는다", () => {
    const { db, boardId, requestId, mailer } = setup();
    expect(() => sendApproved(db, requestId, mailer)).toThrow(/이용자 승인이 없다/);
    expect(getRequest(db, requestId)!.status).toBe("pending_approval");
    expect(outboxFiles()).toEqual([]);
    expect(listEvents(db, boardId).some((event) => event.kind === "transition_rejected")).toBe(true);
  });

  it("승인하면 발송함에 메일 1건이 생기고 상태가 발송됨 → 회신 대기로 바뀐다", () => {
    const { db, requestId, mailer } = setup();
    const request = approveAndSend(db, requestId, mailer);

    expect(request.status).toBe("awaiting_reply");
    expect(request.sent).toMatchObject({ mode: "mock", to: "front@hotel-example.test" });
    const files = outboxFiles();
    expect(files).toHaveLength(1);
    const mail = JSON.parse(readFileSync(path.join(outbox, files[0]), "utf8"));
    expect(mail).toMatchObject({ to: "front@hotel-example.test", subject: SUBJECT, body: BODY, message_id: request.sent!.message_id });
    expect(getHistory(db, requestId).map((entry) => entry.to)).toEqual(["draft", "pending_approval", "sent", "awaiting_reply"]);
  });

  it("승인 후 본문이 한 글자라도 바뀌면 재승인을 요구한다 (저장된 해시까지 바꿔도)", () => {
    const { db, requestId, mailer } = setup();
    approveRequest(db, requestId);
    const changed = BODY.replace("Emma", "Emme");
    db.$client
      .prepare("UPDATE requests SET draft = json_set(draft, '$.body_ko', ?, '$.hash', ?) WHERE id = ?")
      .run(changed, hashDraft(SUBJECT, changed), requestId);

    expect(() => sendApproved(db, requestId, mailer)).toThrow(/재승인/);
    expect(outboxFiles()).toEqual([]);
  });

  it("수정 요청은 이용자 행위로 초안으로 돌리고 메모를 이력에 남긴다", () => {
    const { db, requestId } = setup();
    const request = requestChanges(db, requestId, "Please also ask about parking");
    expect(request.status).toBe("draft");
    expect(getHistory(db, requestId).at(-1)).toMatchObject({ to: "draft", actor: "user", note: "Please also ask about parking" });
  });

  it("언어를 바꿔 역번역을 다시 만들어도 한국어 원문과 해시는 그대로이고 승인·발송이 된다", async () => {
    const { db, requestId, mailer } = setup();
    const before = getRequest(db, requestId)!.draft!;
    const prompts: string[] = [];
    const llm = fakeLlm([], (request) => {
      prompts.push(request.system);
      return { subject: "遅いチェックインの問い合わせ", body: "こんにちは。" };
    });

    const after = (await retranslateDraft(db, llm, requestId, "ja")).draft!;
    expect(prompts[0]).toContain("Japanese");
    expect(after).toMatchObject({ body_ko: before.body_ko, hash: before.hash, back_translation_language: "ja" });
    expect(after.back_translation).toContain("こんにちは");
    expect(approveAndSend(db, requestId, mailer).status).toBe("awaiting_reply");
  });

  it("MAIL_MODE=real은 아직 지원하지 않는다", () => {
    vi.stubEnv("MAIL_MODE", "real");
    expect(() => getMailer()).toThrow(/not supported/);
  });
});
