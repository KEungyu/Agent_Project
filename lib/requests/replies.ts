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

const interpretationSchema = z.object({
  class: z.enum(["done", "conditional", "declined", "info_requested"]),
  conditions: z.array(z.string()),
  requested_info: z.array(z.string()),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  // 자동 처리를 막는 신호. 저장하지 않고, 하나라도 걸리면 이용자 확인으로 넘긴다
  answers_request: z.boolean(),
  matches_requested_time: z.boolean(),
  refuses_requested_time: z.boolean(),
  contradictory: z.boolean(),
  uncertain: z.boolean(),
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
- done: the reply clearly accepts THIS request, for the requested date and time, with nothing more the traveler must do or agree to.
- conditional: accepted only if the traveler meets a condition, pays an extra fee, or follows a step (e.g. ${(hints.conditional ?? []).join(", ")}; also "complete online check-in by 22:00", "call us before you arrive"). Keep every condition and its deadline.
- declined: the request cannot be accepted (e.g. ${(hints.declined ?? []).join(", ")}). Keep the negation. If they offer an alternative (another time or date), it is an alternative to consider, not an acceptance: mention it in the summary as an alternative the traveler could ask for.
- info_requested: the business needs more information before deciding (e.g. ${(hints.info_requested ?? []).join(", ")}; also asking for the booking number or the guest's name). This is not an acceptance.

Low confidence (below ${INTERPRETATION_MIN_CONFIDENCE}) — pick the closest class but set confidence to 0.4 or lower — when:
- the reply only states a general policy (for example "our front desk is open 24 hours") without answering this request;
- the date or time it accepts differs from the requested ones in the facts;
- it contradicts itself: one part allows and another forbids (for example "the staff said 1 AM is fine, but the booking policy says no check-in after midnight"), even when the last sentence sounds final;
- it is uncertain ("probably", "아마", "확답은 어렵다").

Return:
- class
- conditions: each condition or required step with its deadline, written in ${name}. Empty unless class is conditional.
- requested_info: each piece of information they ask for, written in ${name}. Empty unless class is info_requested.
- summary: two short sentences in ${name}: quote the Korean phrase that decides it ("…"), then what it means for the traveler. When confidence is low, say plainly that the reply does not confirm the request yet and what still needs to be confirmed. Never present a general policy as an acceptance.
- confidence: 0 to 1, how sure you are of the class.
- answers_request: false if the reply only states a general policy or does not answer this request.
- matches_requested_time: false if the date or time the reply decides about (allows or refuses) differs from the requested ones in the facts. An alternative the business proposes (for example "please arrive by 11 PM") does not count. true when it gives no date or time.
- refuses_requested_time: true if the reply clearly says the requested date/time is not possible (for example "새벽 1시 체크인은 불가능합니다"), even when it then proposes another time.
- contradictory: true if one part allows and another forbids.
- uncertain: true if it hedges ("probably", "아마", "확답은 어렵다", "확인 후 연락").
Use only what the reply says. Do not invent times, fees, or promises.`;
}

// 회신에 요청한 날짜가 아닌 날짜("10월 11일")가 있으면 모델의 판단과 상관없이 이용자 확인으로 넘긴다 (R06).
// 요청 사실의 날짜는 슬롯 값(YYYY-MM-DD…, KST 표기)에서 월·일만 꺼낸다
export function mentionsOtherDate(rawKo: string, facts?: Record<string, string>): boolean {
  if (!facts) return false;
  const asked = new Set(
    Object.values(facts)
      .map((value) => /^\d{4}-(\d{2})-(\d{2})/.exec(value))
      .filter((match): match is RegExpExecArray => !!match)
      .map((match) => `${Number(match[1])}-${Number(match[2])}`),
  );
  if (asked.size === 0) return false;
  return [...rawKo.matchAll(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)].some((match) => !asked.has(`${Number(match[1])}-${Number(match[2])}`));
}

// facts: 요청한 날짜·시각 등(한국어 표기 포함). 회신이 다른 날짜를 허락했는지 가려내는 데 쓴다
export async function interpretReply(
  llm: LlmClient,
  type: RequestType,
  rawKo: string,
  language: string,
  facts?: Record<string, string>,
): Promise<Interpretation> {
  const result = await llm.structured({
    system: interpretSystem(type, language),
    prompt: [facts ? `What the traveler asked (facts, JSON): ${JSON.stringify(facts)}` : "", `Reply (Korean):\n${rawKo}`].filter(Boolean).join("\n\n"),
    schema: interpretationSchema,
  });
  const { answers_request, matches_requested_time, refuses_requested_time, contradictory, uncertain, ...interpretation } = result;
  // 요청한 시각을 분명히 거절하고 다른 시각을 제안한 답(R04)은 거절이다: 제안한 시각 때문에 생긴 불일치는 확인 사유가 아니다.
  // 다른 날짜만 허락한 답(R06)처럼 요청을 거절하지 않은 불일치는 그대로 이용자 확인으로 넘긴다
  const clearRefusal = result.class === "declined" && refuses_requested_time;
  // 운영시간 안내·다른 날짜·상충·확답 없음은 신뢰도와 상관없이 자동으로 수락·완료하지 않는다
  const doubtful =
    !answers_request || (!matches_requested_time && !clearRefusal) || contradictory || uncertain || mentionsOtherDate(rawKo, facts);
  return { ...interpretation, needs_user_check: doubtful || result.confidence < INTERPRETATION_MIN_CONFIDENCE };
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
