import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { LlmClient } from "../agent/llm";
import { recordEvent, withoutNulls } from "../board/store";
import type { Interpretation, Reply, ReplyClass, Request } from "../board/types";
import type { Db } from "../db/client";
import { replies } from "../db/schema";
import { getLanguage } from "../i18n/languages";
import type { RequestType } from "../request-types/schema";
import { getRequest, INTERPRETATION_MIN_CONFIDENCE, transition, TransitionError } from "./state";

// 회신 등록·해석·분류 (ARCHITECTURE §3 ingest_reply, interpret_reply).
// MVP에서 회신은 시연 화면에서 붙여넣는다(가정 A3).

export const REPLY_CLASSES: ReplyClass[] = ["done", "conditional", "declined", "info_requested"];

const interpretationSchema = z.object({
  class: z.enum(["done", "conditional", "declined", "info_requested"]),
  conditions: z.array(z.string()),
  requested_info: z.array(z.string()),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export function addReply(db: Db, requestId: string, rawKo: string): Reply {
  const request = getRequest(db, requestId);
  if (!request) throw new TransitionError(`요청 없음: ${requestId}`);
  if (request.status !== "awaiting_reply") throw new TransitionError("회신 대기 중인 요청이 아니다");
  const text = rawKo.trim();
  if (!text) throw new TransitionError("회신 내용이 비어 있다");
  const reply: Reply = { id: `rep_${randomUUID()}`, request_id: requestId, received_at: new Date().toISOString(), raw_ko: text };
  db.insert(replies).values(reply).run();
  recordEvent(db, request.board_id, "user_action", { action: "add_reply" }, requestId);
  return reply;
}

export function getLatestReply(db: Db, requestId: string): Reply | null {
  const row = db
    .select()
    .from(replies)
    .where(eq(replies.request_id, requestId))
    .orderBy(desc(replies.received_at))
    .get();
  return row ? (withoutNulls(row) as Reply) : null;
}

function interpretSystem(type: RequestType, language: string): string {
  const name = getLanguage(language).englishName;
  const hints = type.reply_hints ?? {};
  return `You read a Korean business's reply to a traveler's request (${type.label.en}) and classify it.

Classes:
- done: the request is accepted with nothing more the traveler must do or agree to.
- conditional: accepted, but with a condition, extra fee, or a step the traveler must follow (e.g. ${(hints.conditional ?? []).join(", ")}).
- declined: the request cannot be accepted (e.g. ${(hints.declined ?? []).join(", ")}).
- info_requested: the business needs more information before deciding (e.g. ${(hints.info_requested ?? []).join(", ")}).

Return:
- class
- conditions: each condition or required step, written in ${name}. Empty unless class is conditional.
- requested_info: each piece of information they ask for, written in ${name}. Empty unless class is info_requested.
- summary: one or two plain sentences in ${name} telling the traveler what the reply means for them.
- confidence: 0 to 1, how sure you are of the class. Use below ${INTERPRETATION_MIN_CONFIDENCE} when the reply is ambiguous.
Use only what the reply says. Do not invent times, fees, or promises.`;
}

export async function interpretReply(
  llm: LlmClient,
  type: RequestType,
  rawKo: string,
  language: string,
): Promise<Interpretation> {
  const result = await llm.structured({
    system: interpretSystem(type, language),
    prompt: `Reply (Korean):\n${rawKo}`,
    schema: interpretationSchema,
  });
  return { ...result, needs_user_check: result.confidence < INTERPRETATION_MIN_CONFIDENCE };
}

function saveInterpretation(db: Db, replyId: string, interpretation: Interpretation) {
  db.update(replies).set({ interpretation }).where(eq(replies.id, replyId)).run();
}

// 해석을 저장하고, 신뢰도가 충분하면 에이전트가 상태를 바꾼다. 아니면 이용자 확인을 기다린다.
export function applyInterpretation(db: Db, reply: Reply, interpretation: Interpretation): Request {
  saveInterpretation(db, reply.id, interpretation);
  if (interpretation.needs_user_check) return getRequest(db, reply.request_id)!;
  return transition(db, reply.request_id, interpretation.class, "agent", { note: "reply interpreted" });
}

// 이용자가 분류를 확인하거나 직접 고른다 (해석 신뢰도가 낮거나 LLM을 쓸 수 없을 때)
export function confirmReplyClass(db: Db, replyId: string, cls: ReplyClass): Request {
  const row = db.select().from(replies).where(eq(replies.id, replyId)).get();
  if (!row) throw new TransitionError(`회신 없음: ${replyId}`);
  const previous = row.interpretation;
  const interpretation: Interpretation = {
    class: cls,
    conditions: previous?.class === cls ? previous.conditions : [],
    requested_info: previous?.class === cls ? previous.requested_info : [],
    summary: previous?.class === cls ? previous.summary : "",
    confidence: previous?.confidence ?? 0,
    needs_user_check: false,
    confirmed_by_user: true,
  };
  saveInterpretation(db, replyId, interpretation);
  const request = getRequest(db, row.request_id)!;
  recordEvent(db, request.board_id, "user_action", { action: "confirm_reply", class: cls }, row.request_id);
  return transition(db, row.request_id, cls, "user", { note: "reply class confirmed by user" });
}
