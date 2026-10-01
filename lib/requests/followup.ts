import type { Request } from "../board/types";
import type { Db } from "../db/client";
import { fmt, type Messages } from "../i18n/messages";
import { getLatestReply } from "./replies";
import { followUpsFor, type FollowUpKind } from "./followup-kinds";
import { getRequest, transition, TransitionError } from "./state";

export { followUpsFor, type FollowUpKind };

// 회신 이후의 다음 행동 (BACKLOG M13). 조건 수락은 바로 완료하고,
// 나머지는 요청을 다음 회차 초안으로 돌린 뒤 마중에게 보낼 요청 문장(prompt)을 만든다.

export function prepareFollowUp(
  db: Db,
  requestId: string,
  kind: FollowUpKind,
  context: { m: Messages; where: string; typeLabel: string },
): { request: Request; prompt?: string } {
  const current = getRequest(db, requestId);
  if (!current) throw new TransitionError(`요청 없음: ${requestId}`);
  if (!followUpsFor(current.status).includes(kind)) throw new TransitionError(`${current.status} 상태에서 할 수 없는 후속 조치: ${kind}`);
  const interpretation = getLatestReply(db, requestId)?.interpretation;
  const values = { where: context.where, type: context.typeLabel };

  switch (kind) {
    case "accept":
      return { request: transition(db, requestId, "done", "user", { note: "conditions accepted" }) };
    case "reply":
      return {
        request: transition(db, requestId, "draft", "user", { note: "reply to conditions" }),
        prompt: fmt(context.m.followup.replyPrompt, { ...values, conditions: interpretation?.conditions.join(", ") || "-" }),
      };
    case "provide_info":
      return {
        request: transition(db, requestId, "draft", "agent", { note: "follow-up with requested info" }),
        prompt: fmt(context.m.followup.infoPrompt, { ...values, info: interpretation?.requested_info.join(", ") || "-" }),
      };
    case "phone":
      // 거절은 끝난 상태로 두고, 대안은 마중이 새 요청이나 전화 스크립트로 만든다
      return { request: current, prompt: fmt(context.m.followup.phonePrompt, values) };
  }
}
