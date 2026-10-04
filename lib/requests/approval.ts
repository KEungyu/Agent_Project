import { eq } from "drizzle-orm";
import { getBoard, getStay, recordEvent } from "../board/store";
import type { Request } from "../board/types";
import { loadRequestTypes } from "../request-types/loader";
import { checkConditions } from "./conditions";
import type { Db } from "../db/client";
import { requests } from "../db/schema";
import type { LlmClient } from "../agent/llm";
import { MailError, type Mailer } from "../mail/mailer";
import { approvalHash, backTranslate } from "./drafting";
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

// 이 요청의 메일 받는 곳: 식당 등 장소 요청은 요청에 담긴 주소(place_email), 숙소 요청은 그 숙소의 이메일
export function requestRecipient(db: Db, request: Request): string | undefined {
  if (request.slots.place_email) return request.slots.place_email;
  return request.target_id ? getStay(db, request.target_id)?.email : undefined;
}

// 이용자가 화면에서 본 버전: 원문 해시와 수신처
export type SeenVersion = { hash: string; to: string };

// 지금 서버에 있는 버전 (화면에 내려보내 승인할 때 그대로 돌려받는다)
export function currentVersion(db: Db, request: Request): SeenVersion | null {
  const to = requestRecipient(db, request);
  return request.draft && to ? { hash: request.draft.hash, to } : null;
}

// 승인할 수 없는 이유(화면이 오래됐다): 원문·수신처·예약 사실이 화면과 다르다
export class StaleApprovalError extends ApprovalError {
  constructor(message: string) {
    super(message);
    this.name = "StaleApprovalError";
  }
}

const KEY_FACTS = ["stay_name", "guest_name", "booking_ref", "check_in_date", "check_out_date", "expected_arrival"];
const sameValue = (a: string, b: string) => {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return /\d{4}-\d{2}-\d{2}T/.test(a) && !Number.isNaN(ta) && !Number.isNaN(tb) ? ta === tb : a.trim() === b.trim();
};

// 초안을 쓴 뒤 보드의 예약 사실(예약번호·날짜·도착 일시 등)이 바뀌었는지
function changedFacts(db: Db, request: Request): string[] {
  const board = getBoard(db, request.board_id);
  const type = loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
  if (!board || !type) return [];
  const current = checkConditions(type, board, { targetId: request.target_id }).filled;
  return KEY_FACTS.filter((key) => request.slots[key] && current[key] && !sameValue(request.slots[key], current[key]));
}

export function approveRequest(db: Db, requestId: string, seen: SeenVersion): Request {
  const request = load(db, requestId);
  if (request.status !== "pending_approval" || !request.draft) throw new ApprovalError("승인 대기 중인 초안이 아니다");
  const to = requestRecipient(db, request);
  // 화면에서 본 원문·수신처가 지금 서버의 값과 같을 때만 승인한다 (오래된 카드에서 최신 초안을 승인하지 않게)
  const stale =
    seen.hash !== request.draft.hash
      ? "화면의 초안이 최신이 아니다"
      : (seen.to ?? "").trim().toLowerCase() !== (to ?? "").trim().toLowerCase()
        ? "화면의 수신처가 최신이 아니다"
        : changedFacts(db, request).length > 0
          ? `초안을 쓴 뒤 예약 사실이 바뀌었다: ${changedFacts(db, request).join(", ")}`
          : null;
  if (stale) {
    recordEvent(db, request.board_id, "transition_rejected", { from: request.status, to: "sent", actor: "user", reason: stale }, request.id);
    throw new StaleApprovalError(stale);
  }
  if (!to) throw new ApprovalError("받는 사람 이메일이 없다");
  const approval = {
    approved_at: new Date().toISOString(),
    approved_by: "user" as const,
    draft_hash: approvalHash(request.draft.subject_ko, request.draft.body_ko, to),
  };
  db.update(requests).set({ approval }).where(eq(requests.id, requestId)).run();
  recordEvent(db, request.board_id, "user_action", { action: "approve" }, requestId);
  return load(db, requestId);
}

// 같은 요청을 동시에 두 번 처리하지 않는다 (빠른 중복 클릭·재시도)
const inFlight = new Set<string>();

export async function sendApproved(db: Db, requestId: string, mailer: Mailer): Promise<Request> {
  const request = load(db, requestId);
  if (request.status !== "pending_approval" || !request.draft) reject(db, request, "승인 대기 중인 초안이 아니다");
  if (request.approval?.approved_by !== "user") reject(db, request, "이용자 승인이 없다");
  const to = requestRecipient(db, request);
  if (!to) reject(db, request, "받는 사람 이메일이 없다");
  // 저장된 해시가 아니라 지금의 원문·수신처로 다시 계산해 승인 당시와 비교한다
  const hash = approvalHash(request.draft.subject_ko, request.draft.body_ko, to);
  if (request.approval.draft_hash !== hash) reject(db, request, "승인 후 본문이나 수신처가 바뀌었다: 재승인 필요");
  if (inFlight.has(requestId)) reject(db, request, "이미 처리 중이다");

  inFlight.add(requestId);
  try {
    // 승인 해시를 멱등키로 넘겨, 실제 발송 서비스에서도 같은 승인 버전이 두 번 나가지 않게 한다
    const result = await mailer.send({ to, subject: request.draft.subject_ko, body: request.draft.body_ko, idempotencyKey: hash });
    const sent = { at: new Date().toISOString(), message_id: result.message_id, mode: result.mode, to };
    transition(db, requestId, "sent", "system", { patch: { sent, channel: "email" } });
    return transition(db, requestId, "awaiting_reply", "system");
  } catch (error) {
    if (error instanceof MailError) {
      recordEvent(db, request.board_id, "transition_rejected", { from: request.status, to: "sent", actor: "system", reason: `send_failed:${error.code}`, mode: mailer.mode }, requestId);
      throw new ApprovalError(error.code === "unknown" ? "발송 결과를 확인할 수 없다: 같은 승인 버전으로 다시 시도하면 중복되지 않는다" : error.message);
    }
    throw error;
  } finally {
    inFlight.delete(requestId);
  }
}

export async function approveAndSend(db: Db, requestId: string, mailer: Mailer, seen: SeenVersion): Promise<Request> {
  approveRequest(db, requestId, seen);
  return sendApproved(db, requestId, mailer);
}

export function requestChanges(db: Db, requestId: string, note: string): Request {
  const request = load(db, requestId);
  recordEvent(db, request.board_id, "user_action", { action: "request_changes" }, requestId);
  return transition(db, requestId, "draft", "user", { note: note || undefined });
}

// 이용자가 언어를 바꾸면 승인 대기 초안의 역번역을 그 언어로 다시 만든다.
// 한국어 원문은 그대로라 승인용 해시도 바뀌지 않는다.
export async function retranslateDraft(db: Db, llm: LlmClient, requestId: string, language: string): Promise<Request> {
  const request = load(db, requestId);
  if (request.status !== "pending_approval" || !request.draft) throw new ApprovalError("승인 대기 중인 초안이 아니다");
  const back_translation = await backTranslate(llm, request.draft.subject_ko, request.draft.body_ko, language);
  const draft = { ...request.draft, back_translation, back_translation_language: language };
  db.update(requests).set({ draft }).where(eq(requests.id, requestId)).run();
  recordEvent(db, request.board_id, "user_action", { action: "retranslate", language }, requestId);
  return load(db, requestId);
}
