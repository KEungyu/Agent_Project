import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { saveStayForm } from "../board/forms";
import { listEvents } from "../board/store";
import { openDb } from "../db/client";
import { createMockMailer, createRealMailer, getMailer, MailError, type Mail, type Mailer, type SendResult } from "../mail/mailer";
import { fakeLlm } from "../agent/testing";
import { eq } from "drizzle-orm";
import { requests } from "../db/schema";
import { currentVersion, approveAndSend, approveRequest, requestChanges, retranslateDraft, sendApproved, StaleApprovalError } from "./approval";
import { hashDraft } from "./drafting";
import { createRequest, getHistory, getRequest, transition } from "./state";

// 카드가 지금 서버의 원문·수신처를 그대로 보고 있는 경우
const seen = (db: Parameters<typeof currentVersion>[0], requestId: string) => currentVersion(db, getRequest(db, requestId)!)!;

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
  it("승인 없이 발송하면 거부되고 승인 대기로 남으며 아무것도 보내지 않는다", async () => {
    const { db, boardId, requestId, mailer } = setup();
    await expect(sendApproved(db, requestId, mailer)).rejects.toThrow(/이용자 승인이 없다/);
    expect(getRequest(db, requestId)!.status).toBe("pending_approval");
    expect(outboxFiles()).toEqual([]);
    expect(listEvents(db, boardId).some((event) => event.kind === "transition_rejected")).toBe(true);
  });

  it("승인하면 발송함에 메일 1건이 생기고 상태가 발송됨 → 회신 대기로 바뀐다", async () => {
    const { db, requestId, mailer } = setup();
    const request = await approveAndSend(db, requestId, mailer, seen(db, requestId));

    expect(request.status).toBe("awaiting_reply");
    expect(request.sent).toMatchObject({ mode: "mock", to: "front@hotel-example.test" });
    const files = outboxFiles();
    expect(files).toHaveLength(1);
    const mail = JSON.parse(readFileSync(path.join(outbox, files[0]), "utf8"));
    expect(mail).toMatchObject({ to: "front@hotel-example.test", subject: SUBJECT, body: BODY, message_id: request.sent!.message_id });
    expect(getHistory(db, requestId).map((entry) => entry.to)).toEqual(["draft", "pending_approval", "sent", "awaiting_reply"]);
  });

  it("같은 초안을 두 번 승인·발송해도 모의 발송은 한 번만 기록된다 (빠른 중복 클릭·재시도)", async () => {
    const { db, requestId, mailer } = setup();
    await approveAndSend(db, requestId, mailer, seen(db, requestId));
    await expect(approveAndSend(db, requestId, mailer, seen(db, requestId))).rejects.toThrow();
    expect(outboxFiles()).toHaveLength(1);
    expect(getHistory(db, requestId).filter((entry) => entry.to === "sent")).toHaveLength(1);
  });

  it("F2-32 승인 후 본문이 한 글자라도 바뀌면 재승인을 요구한다 (저장된 해시까지 바꿔도)", async () => {
    const { db, requestId, mailer } = setup();
    approveRequest(db, requestId, seen(db, requestId));
    const changed = BODY.replace("Emma", "Emme");
    db.$client
      .prepare("UPDATE requests SET draft = json_set(draft, '$.body_ko', ?, '$.hash', ?) WHERE id = ?")
      .run(changed, hashDraft(SUBJECT, changed), requestId);

    await expect(sendApproved(db, requestId, mailer)).rejects.toThrow(/재승인/);
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
    expect((await approveAndSend(db, requestId, mailer, seen(db, requestId))).status).toBe("awaiting_reply");
  });

  it("MAIL_MODE=real은 발송 서비스 설정과 허용 목록이 없으면 켜지지 않고, 빠진 항목 이름만 알린다", () => {
    vi.stubEnv("MAIL_MODE", "real");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_FROM", "");
    vi.stubEnv("MAIL_ALLOWLIST", "");
    expect(() => getMailer()).toThrow(/RESEND_API_KEY, MAIL_FROM, MAIL_ALLOWLIST/);
  });
});

describe("화면에서 본 버전과 승인 대상 (2026-10-04 검토 A~F, 서버 함수 단위)", () => {
  it("A. 카드가 V1을 보는 동안 서버 본문이 V2로 바뀌면 승인을 거부하고 모의 발송 0회", async () => {
    const { db, requestId, mailer } = setup();
    const v1 = seen(db, requestId);
    const draft = { subject_ko: SUBJECT, body_ko: `${BODY} (V2)`, back_translation: "t", hash: hashDraft(SUBJECT, `${BODY} (V2)`) };
    db.update(requests).set({ draft }).where(eq(requests.id, requestId)).run();
    await expect(approveAndSend(db, requestId, mailer, v1)).rejects.toThrow(StaleApprovalError);
    expect(outboxFiles()).toEqual([]);
    expect(getRequest(db, requestId)!.status).toBe("pending_approval");
  });

  it("B. 카드가 수신처 A를 보는 동안 숙소 이메일이 B로 바뀌면 거부하고 모의 발송 0회", async () => {
    const { db, requestId, mailer } = setup();
    const before = seen(db, requestId);
    db.$client.prepare("UPDATE stays SET email = 'other@hotel-example.test'").run();
    await expect(approveAndSend(db, requestId, mailer, before)).rejects.toThrow(StaleApprovalError);
    expect(outboxFiles()).toEqual([]);
  });

  it("B'. 승인 뒤 처리 직전에 수신처가 바뀌어도 발송하지 않는다", async () => {
    const { db, requestId, mailer } = setup();
    approveRequest(db, requestId, seen(db, requestId));
    db.$client.prepare("UPDATE stays SET email = 'other@hotel-example.test'").run();
    await expect(sendApproved(db, requestId, mailer)).rejects.toThrow(/수신처/);
    expect(outboxFiles()).toEqual([]);
  });

  it("C. 초안을 쓴 뒤 보드의 예약번호나 호텔 도착 일시가 바뀌면 오래된 초안을 처리하지 않는다", async () => {
    const { db, requestId, mailer } = setup();
    db.update(requests).set({ slots: { booking_ref: "BK123456", expected_arrival: "2026-10-20T01:30+09:00" } }).where(eq(requests.id, requestId)).run();
    db.$client.prepare("UPDATE stays SET expected_arrival = '2026-10-20T03:00+09:00' WHERE booking_ref = 'BK123456'").run();
    await expect(approveAndSend(db, requestId, mailer, seen(db, requestId))).rejects.toThrow(/예약 사실/);
    expect(outboxFiles()).toEqual([]);
  });

  it("A06. 공항 안내의 숙소 도착 시각 폼으로 바꾸면 예전 시각의 초안은 처리하지 않는다", async () => {
    const { db, requestId, mailer } = setup();
    const stay = getRequest(db, requestId)!.target_id!;
    db.update(requests).set({ slots: { expected_arrival: "2026-10-20T01:30+09:00" } }).where(eq(requests.id, requestId)).run();
    const form = new FormData();
    form.set("stay_id", stay);
    form.set("expected_arrival", "2026-10-20T03:00");
    form.set("confirm_arrival", "on");
    saveStayForm(db, form);
    await expect(approveAndSend(db, requestId, mailer, seen(db, requestId))).rejects.toThrow(/예약 사실/);
    expect(outboxFiles()).toEqual([]);
  });

  it("C'. 같은 시각을 다른 표기로 저장한 것은 바뀐 것으로 보지 않는다", async () => {
    const { db, requestId, mailer } = setup();
    db.update(requests).set({ slots: { expected_arrival: "2026-10-20T01:30:00+09:00" } }).where(eq(requests.id, requestId)).run();
    expect((await approveAndSend(db, requestId, mailer, seen(db, requestId))).status).toBe("awaiting_reply");
  });

  it("D. 화면 언어·번역만 바뀌면 원문·수신처가 같으므로 다시 승인하지 않아도 된다", async () => {
    const { db, requestId, mailer } = setup();
    const view = seen(db, requestId);
    const llm = fakeLlm([], () => ({ subject: "件名", body: "本文" }));
    await retranslateDraft(db, llm, requestId, "ja");
    expect((await approveAndSend(db, requestId, mailer, view)).status).toBe("awaiting_reply");
  });

  it("E. 변경이 없으면 화면에서 본 수신처로 모의 처리된다", async () => {
    const { db, requestId, mailer } = setup();
    const view = seen(db, requestId);
    const request = await approveAndSend(db, requestId, mailer, view);
    expect(request.sent?.to).toBe(view.to);
    const mail = JSON.parse(readFileSync(path.join(outbox, outboxFiles()[0]), "utf8"));
    expect(mail).toMatchObject({ to: view.to, subject: SUBJECT, body: BODY });
  });
});

describe("실제 메일 어댑터 (모의 HTTP, 실제 발송 없음)", () => {
  const env = { RESEND_API_KEY: "test-key", MAIL_FROM: "team@example.org", MAIL_ALLOWLIST: "team-inbox@example.org" };

  it("허용 목록(팀 소유 주소)에 없는 수신처로는 서비스에 요청하지 않는다", async () => {
    let calls = 0;
    const mailer = createRealMailer(env, async () => {
      calls++;
      return new Response("{}", { status: 200 });
    });
    await expect(mailer.send({ to: "front@hotel-example.test", subject: "s", body: "b" })).rejects.toMatchObject({ code: "not_allowed" });
    expect(calls).toBe(0);
  });

  it("접수되면 접수 ID만 돌려주고, 멱등키를 함께 보낸다", async () => {
    const seen: RequestInit[] = [];
    const mailer = createRealMailer(env, async (_url, init) => {
      seen.push(init);
      return new Response(JSON.stringify({ id: "re_123" }), { status: 200 });
    });
    expect(await mailer.send({ to: "team-inbox@example.org", subject: "s", body: "b", idempotencyKey: "hash-1" })).toEqual({ message_id: "re_123", mode: "real" });
    expect((seen[0].headers as Record<string, string>)["Idempotency-Key"]).toBe("hash-1");
  });

  it("응답이 없으면 성공·실패를 단정하지 않고 '결과 불명'으로 알린다", async () => {
    const mailer = createRealMailer(env, async () => {
      throw new Error("network down");
    });
    await expect(mailer.send({ to: "team-inbox@example.org", subject: "s", body: "b" })).rejects.toMatchObject({ code: "unknown" });
  });

  it("발송 결과가 불명확하면 요청은 승인 대기로 남고 발송됨으로 바뀌지 않는다", async () => {
    const { db, requestId } = setup();
    const unknown = { mode: "real" as const, send: async () => Promise.reject(new MailError("no answer", "unknown")) };
    await expect(approveAndSend(db, requestId, unknown, seen(db, requestId))).rejects.toThrow(/확인할 수 없다/);
    expect(getRequest(db, requestId)!.status).toBe("pending_approval");
  });
});

describe("발송 처리 중 승인·초안 보존 (모의 메일러, 외부 발송 없음)", () => {
  function deferredMailer() {
    const calls: Mail[] = [];
    let resolve!: (result: SendResult) => void;
    const mailer: Mailer = {
      mode: "mock",
      send(mail) {
        calls.push(mail);
        return new Promise<SendResult>((done) => { resolve = done; });
      },
    };
    return { mailer, calls, finish: () => resolve({ mode: "mock", message_id: "mock-in-flight" }) };
  }

  it("발송 중 재승인·수정·재번역을 거절하고 첫 승인과 발송 본문을 그대로 보존한다", async () => {
    const { db, requestId } = setup();
    const delivery = deferredMailer();
    const sending = approveAndSend(db, requestId, delivery.mailer, seen(db, requestId));
    const approved = getRequest(db, requestId)!.approval;
    const llm = fakeLlm([], () => ({ subject: "New translation", body: "New translation" }));

    expect(() => approveRequest(db, requestId, seen(db, requestId))).toThrow(/처리 중/);
    expect(() => requestChanges(db, requestId, "Change the message")).toThrow(/처리 중/);
    await expect(retranslateDraft(db, llm, requestId, "ja")).rejects.toThrow(/처리 중/);
    expect(llm.structured).not.toHaveBeenCalled();
    expect(getRequest(db, requestId)!.approval).toEqual(approved);
    expect(delivery.calls).toHaveLength(1);

    delivery.finish();
    expect((await sending).status).toBe("awaiting_reply");
    expect(getRequest(db, requestId)!.draft?.body_ko).toBe(delivery.calls[0].body);
  });

  it.each(["draft", "recipient"])("다른 경로로 %s가 바뀌면 접수 근거를 남기고 바뀐 내용을 발송됨으로 표시하지 않는다", async (changed) => {
    const { db, boardId, requestId } = setup();
    const delivery = deferredMailer();
    const sending = approveAndSend(db, requestId, delivery.mailer, seen(db, requestId));
    const approved = getRequest(db, requestId)!.approval;
    if (changed === "draft") {
      const body = "This different draft was never sent";
      const draft = { subject_ko: SUBJECT, body_ko: body, back_translation: "Changed", hash: hashDraft(SUBJECT, body) };
      db.update(requests).set({ draft }).where(eq(requests.id, requestId)).run();
    } else {
      db.$client.prepare("UPDATE stays SET email = 'changed@example.test'").run();
    }
    await expect(approveAndSend(db, requestId, delivery.mailer, seen(db, requestId))).rejects.toThrow(/처리 중/);
    expect(getRequest(db, requestId)!.approval).toEqual(approved);

    delivery.finish();
    await expect(sending).rejects.toThrow(/다시 보내지 말고/);
    expect(delivery.calls).toHaveLength(1);
    expect(delivery.calls[0]).toMatchObject({ body: BODY, to: "front@hotel-example.test" });
    expect(getRequest(db, requestId)!.status).toBe("pending_approval");
    expect(getRequest(db, requestId)!.sent).toBeUndefined();
    expect(listEvents(db, boardId)).toContainEqual(expect.objectContaining({ detail: expect.objectContaining({
      reason: "send_accepted_after_change", recipient: "front@hotel-example.test", message_id: "mock-in-flight", approved_hash: approved!.draft_hash,
    }) }));
  });

  it("재번역을 먼저 시작했어도 발송이 진행되면 늦게 돌아온 번역으로 초안을 덮어쓰지 않는다", async () => {
    const { db, requestId } = setup();
    let finishTranslation!: (result: { subject: string; body: string }) => void;
    const llm = fakeLlm([], () => new Promise((resolve) => { finishTranslation = resolve; }));
    const translating = retranslateDraft(db, llm, requestId, "ja");
    const delivery = deferredMailer();
    const sending = approveAndSend(db, requestId, delivery.mailer, seen(db, requestId));
    finishTranslation({ subject: "遅い翻訳", body: "新しい翻訳" });
    await expect(translating).rejects.toThrow(/처리 중/);
    delivery.finish();
    expect((await sending).draft?.back_translation).toBe("Subject: Late check-in");
  });

  it("같은 요청의 재시도는 같은 멱등키를 쓰고 동일 내용의 새 시연 요청은 다른 키를 쓴다", async () => {
    const { db, boardId, requestId } = setup();
    const keys: string[] = [];
    const mailer: Mailer = {
      mode: "real",
      async send(mail) {
        keys.push(mail.idempotencyKey!);
        if (keys.length === 1) throw new MailError("response unavailable", "unknown");
        return { mode: "real", message_id: `fake-provider-${keys.length}` };
      },
    };
    await expect(approveAndSend(db, requestId, mailer, seen(db, requestId))).rejects.toThrow(/확인할 수 없다/);
    await approveAndSend(db, requestId, mailer, seen(db, requestId));
    const original = getRequest(db, requestId)!;
    const another = createRequest(db, { boardId, typeId: "late_checkin", targetId: original.target_id, slots: {} }, "agent");
    transition(db, another.id, "pending_approval", "agent", { patch: { draft: original.draft } });
    await approveAndSend(db, another.id, mailer, seen(db, another.id));

    expect(keys).toHaveLength(3);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toBe(`${requestId}:${original.approval!.draft_hash}`);
    expect(keys[2]).toBe(`${another.id}:${original.approval!.draft_hash}`);
    expect(keys[2]).not.toBe(keys[0]);
  });
});
