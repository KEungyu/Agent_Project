import { eq } from "drizzle-orm";
import { getStay, recordEvent } from "../board/store";
import type { Request } from "../board/types";
import type { Db } from "../db/client";
import { requests } from "../db/schema";
import type { Mailer } from "../mail/mailer";
import { hashDraft } from "./drafting";
import { getRequest, transition } from "./state";

// 승인과 발송 (ARCHITECTURE §3 승인 게이트). 발송은 이용자가 화면에서 승인할 때만 일어나며, LLM에게는 발송 도구가 없다.

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

function load(db: Db, requestId: string): Request {
  const request = getRequest(db, requestId);
  if (!request) throw new ApprovalError(`요청 없음: ${requestId}`);
  return request;
}

function reject(db: Db, request: Request, reason: string): never {
  recordEvent(db, request.board_id, "transition_rejected", { from: request.status, to: "sent", actor: "system", reason }, request.id);
  throw new ApprovalError(reason);
}

export function approveRequest(db: Db, requestId: string): Request {
  const request = load(db, requestId);
  if (request.status !== "pending_approval" || !request.draft) throw new ApprovalError("승인 대기 중인 초안이 아니다");
  const approval = {
    approved_at: new Date().toISOString(),
    approved_by: "user" as const,
    draft_hash: hashDraft(request.draft.subject_ko, request.draft.body_ko),
  };
  db.update(requests).set({ approval }).where(eq(requests.id, requestId)).run();
  recordEvent(db, request.board_id, "user_action", { action: "approve" }, requestId);
  return load(db, requestId);
}

export function sendApproved(db: Db, requestId: string, mailer: Mailer): Request {
  const request = load(db, requestId);
  if (request.status !== "pending_approval" || !request.draft) reject(db, request, "승인 대기 중인 초안이 아니다");
  if (request.approval?.approved_by !== "user") reject(db, request, "이용자 승인이 없다");
  // 저장된 해시가 아니라 현재 본문으로 다시 계산해 승인 당시와 비교한다
  if (request.approval.draft_hash !== hashDraft(request.draft.subject_ko, request.draft.body_ko)) {
    reject(db, request, "승인 후 본문이 바뀌었다: 재승인 필요");
  }
  const to = request.target_id ? getStay(db, request.target_id)?.email : undefined;
  if (!to) reject(db, request, "받는 사람 이메일이 없다");

  const result = mailer.send({ to, subject: request.draft.subject_ko, body: request.draft.body_ko });
  const sent = { at: new Date().toISOString(), message_id: result.message_id, mode: result.mode, to };
  transition(db, requestId, "sent", "system", { patch: { sent, channel: "email" } });
  return transition(db, requestId, "awaiting_reply", "system");
}

export function approveAndSend(db: Db, requestId: string, mailer: Mailer): Request {
  approveRequest(db, requestId);
  return sendApproved(db, requestId, mailer);
}

export function requestChanges(db: Db, requestId: string, note: string): Request {
  const request = load(db, requestId);
  recordEvent(db, request.board_id, "user_action", { action: "request_changes" }, requestId);
  return transition(db, requestId, "draft", "user", { note: note || undefined });
}
