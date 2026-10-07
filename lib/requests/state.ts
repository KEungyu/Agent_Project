import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { recordEvent, withoutNulls } from "../board/store";
import type { Actor, HistoryEntry, Request, RequestStatus } from "../board/types";
import type { Db } from "../db/client";
import { replies, requestHistory, requests } from "../db/schema";
import { approvalHash } from "./drafting";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: "초안",
  pending_approval: "승인 대기",
  sent: "발송됨",
  awaiting_reply: "회신 대기",
  done: "완료",
  conditional: "조건부 수락",
  declined: "거절",
  info_requested: "추가 정보 요청",
};

export const INTERPRETATION_MIN_CONFIDENCE = 0.7;

// 일회성 이용자 확인. 저장 모델을 늘리지 않고 기존 이력 note에 근거를 남긴다.
export type ConditionConfirmation = { replyId: string; fulfilled: boolean; deadlineMet: boolean };
type Guard = (request: Request, db: Db, actor: Actor, confirmation?: ConditionConfirmation) => string | null;

type Rule = { actors: Actor[]; guard?: Guard; newRound?: boolean };

const hasConfidentReply: Guard = (request, db, actor) => {
  if (actor === "user") return null; // 이용자가 분류를 확인한 경우
  const latest = db
    .select()
    .from(replies)
    .where(eq(replies.request_id, request.id))
    .orderBy(desc(replies.received_at))
    .get();
  const confidence = latest?.interpretation?.confidence;
  if (confidence === undefined) return "해석된 회신이 없다";
  if (confidence < INTERPRETATION_MIN_CONFIDENCE) return `해석 신뢰도 ${confidence} < ${INTERPRETATION_MIN_CONFIDENCE}: 이용자 확인 필요`;
  return null;
};

const replyOutcome: Rule = { actors: ["agent", "user"], guard: hasConfidentReply };

// ARCHITECTURE §5 전이 표. 여기에 없는 전이는 모두 거부한다.
const TRANSITIONS: Partial<Record<RequestStatus, Partial<Record<RequestStatus, Rule>>>> = {
  draft: {
    pending_approval: {
      actors: ["agent"],
      guard: (request) => (request.draft?.body_ko && request.draft.back_translation ? null : "초안 또는 역번역이 없다"),
    },
  },
  pending_approval: {
    draft: { actors: ["user"] },
    sent: {
      actors: ["system"],
      guard: (request) => {
        if (!request.draft) return "초안이 없다";
        if (request.approval?.approved_by !== "user") return "이용자 승인이 없다";
        if (!request.sent?.at || !request.sent.to) return "발송 기록이 없다";
        // 승인 해시는 원문과 수신처를 함께 묶는다
        if (request.approval.draft_hash !== approvalHash(request.draft.subject_ko, request.draft.body_ko, request.sent.to)) {
          return "승인 후 본문이나 수신처가 바뀌었다: 재승인 필요";
        }
        return null;
      },
    },
  },
  sent: {
    awaiting_reply: { actors: ["system"], guard: (request) => (request.sent?.message_id ? null : "message_id가 없다") },
  },
  awaiting_reply: {
    done: replyOutcome,
    conditional: replyOutcome,
    declined: replyOutcome,
    info_requested: replyOutcome,
  },
  conditional: {
    done: {
      actors: ["user"],
      guard: (request, db, _actor, confirmation) => {
        const latest = db.select().from(replies).where(eq(replies.request_id, request.id)).orderBy(desc(replies.received_at)).get();
        if (!latest || confirmation?.replyId !== latest.id) return "최신 회신의 조건을 다시 확인해 주세요";
        if (confirmation.fulfilled !== true || confirmation.deadlineMet !== true) return "조건 이행과 기한 확인이 필요합니다";
        return null;
      },
    },
    draft: { actors: ["user"], newRound: true },
  },
  info_requested: {
    draft: { actors: ["agent"], newRound: true },
  },
};

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

export type NewRequest = {
  boardId: string;
  typeId: string;
  targetId?: string;
  parentRequestId?: string;
  slots: Record<string, string>;
};

type RequestPatch = Partial<Pick<Request, "channel" | "slots" | "draft" | "approval" | "sent">>;

const now = () => new Date().toISOString();

export function getRequest(db: Db, requestId: string): Request | null {
  const row = db.select().from(requests).where(eq(requests.id, requestId)).get();
  return row ? (withoutNulls(row) as Request) : null;
}

export function getHistory(db: Db, requestId: string): HistoryEntry[] {
  return db
    .select()
    .from(requestHistory)
    .where(eq(requestHistory.request_id, requestId))
    .orderBy(asc(requestHistory.id))
    .all()
    .map((row) => ({
      request_id: row.request_id,
      from: row.from_status,
      to: row.to_status,
      at: row.at,
      actor: row.actor,
      ...(row.note ? { note: row.note } : {}),
    }));
}

// 상태는 그대로 두고 채널만 기록한다 (전화 스크립트 경로: 앱이 보내지 않으므로 승인·발송 단계가 없다)
export function setRequestChannel(db: Db, requestId: string, channel: Request["channel"]): Request {
  db.update(requests).set({ channel, updated_at: now() }).where(eq(requests.id, requestId)).run();
  return getRequest(db, requestId)!;
}

export function createRequest(db: Db, input: NewRequest, actor: Actor): Request {
  const at = now();
  const id = `req_${randomUUID()}`;
  db.insert(requests)
    .values({
      id,
      board_id: input.boardId,
      type_id: input.typeId,
      target_id: input.targetId,
      parent_request_id: input.parentRequestId,
      round: 1,
      status: "draft",
      slots: input.slots,
      created_at: at,
      updated_at: at,
    })
    .run();
  log(db, input.boardId, id, null, "draft", actor, at);
  return getRequest(db, id)!;
}

// 상태를 바꾸고, 바꾸기 전에 필요한 필드(patch)를 함께 저장한다. 가드는 patch가 적용된 모습으로 검사한다.
export function transition(
  db: Db,
  requestId: string,
  to: RequestStatus,
  actor: Actor,
  options: { patch?: RequestPatch; note?: string; conditionConfirmation?: ConditionConfirmation } = {},
): Request {
  const current = getRequest(db, requestId);
  if (!current) throw new TransitionError(`요청 없음: ${requestId}`);

  const rule = TRANSITIONS[current.status]?.[to];
  const candidate: Request = { ...current, ...options.patch };
  const reason = !rule
    ? `허용되지 않은 전이: ${current.status} → ${to}`
    : !rule.actors.includes(actor)
      ? `행위자 ${actor}는 ${current.status} → ${to} 전이를 할 수 없다`
      : (rule.guard?.(candidate, db, actor, options.conditionConfirmation) ?? null);

  if (reason) {
    recordEvent(db, current.board_id, "transition_rejected", { from: current.status, to, actor, reason }, requestId);
    throw new TransitionError(reason);
  }

  const at = now();
  // 새 라운드는 이전 초안·승인·발송 기록을 지워 지난 승인이 재사용되지 않게 한다
  const roundReset = rule!.newRound ? { round: current.round + 1, draft: null, approval: null, sent: null } : {};
  db.update(requests)
    .set({ ...options.patch, ...roundReset, status: to, updated_at: at })
    .where(eq(requests.id, requestId))
    .run();
  const note = current.status === "conditional" && to === "done"
    ? `conditions fulfilled; deadline met or none (user confirmed); reply ${options.conditionConfirmation!.replyId}`
    : options.note;
  log(db, current.board_id, requestId, current.status, to, actor, at, note);
  return getRequest(db, requestId)!;
}

function log(
  db: Db,
  boardId: string,
  requestId: string,
  from: RequestStatus | null,
  to: RequestStatus,
  actor: Actor,
  at: string,
  note?: string,
) {
  db.insert(requestHistory).values({ request_id: requestId, from_status: from, to_status: to, at, actor, note }).run();
  recordEvent(db, boardId, "state_change", { from, to, actor }, requestId);
}
