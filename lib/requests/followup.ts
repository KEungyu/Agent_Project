import type { Request } from "../board/types";
import type { Db } from "../db/client";
import { fmt, type Messages } from "../i18n/messages";
import { getLatestReply } from "./replies";
import { followUpsFor, type FollowUpKind } from "./followup-kinds";
import { getRequest, transition, TransitionError, type ConditionConfirmation } from "./state";

export { followUpsFor, type FollowUpKind };

// 회신 이후의 다음 행동 (BACKLOG M13). accept는 "조건에 동의함"이 아니라 "조건을 마쳤다"는 이용자 확인이다:
// 온라인 체크인·결제·사전 연락처럼 할 일이 있는 조건은 이용자가 직접 마친 뒤에만 완료한다(앱이 대신 하지 않는다).
// 완료(done)는 이 문의가 해결됐다는 뜻이며 새 예약이나 실제 투숙을 뜻하지 않는다. 조건 동의만 알리려면 reply를 쓴다.
// 나머지는 요청을 다음 회차 초안으로 돌린 뒤 마중에게 보낼 요청 문장(prompt)을 만든다.

export function prepareFollowUp(
  db: Db,
  requestId: string,
  kind: FollowUpKind,
  context: { m: Messages; where: string; typeLabel: string },
  confirmation?: ConditionConfirmation,
): { request: Request; prompt?: string } {
  const current = getRequest(db, requestId);
  if (!current) throw new TransitionError(`요청 없음: ${requestId}`);
  if (!followUpsFor(current.status).includes(kind)) throw new TransitionError(`${current.status} 상태에서 할 수 없는 후속 조치: ${kind}`);
  const interpretation = getLatestReply(db, requestId)?.interpretation;
  const values = { where: context.where, type: context.typeLabel };

  switch (kind) {
    case "accept":
      if (!confirmation || !confirmation.fulfilled || !confirmation.deadlineMet) throw new TransitionError(context.m.followup.conditionNote);
      return { request: transition(db, requestId, "done", "user", { conditionConfirmation: confirmation }) };
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
