import { listEvents, recordEvent } from "../board/store";
import type { Db } from "../db/client";
import { hasExternalBookingDetails, type ExternalAction } from "./links";

// 외부 예약 사이트(Booking.com·Catchtable)에서 이용자가 직접 한 결과. 마중이는 그 사이트의 결과를 알 수 없으므로
// 이용자가 고른 값만 "이용자 기록"으로 남긴다(사이트를 열었다·돌아왔다는 것만으로는 아무것도 기록하지 않는다).
// 저장 구조를 바꾸지 않고 이벤트 기록(시각·행위자 포함)에 쌓는다. 가장 최근 기록이 그 카드의 현재 값이다.
export const EXTERNAL_RESULTS = ["booked", "waitlisted", "requested", "not_yet"] as const;
export type ExternalResult = (typeof EXTERNAL_RESULTS)[number];

export function recordExternalResult(db: Db, boardId: string, action: Pick<ExternalAction, "id" | "provider" | "summary">, result: ExternalResult, confirmed = false): boolean {
  if (!EXTERNAL_RESULTS.includes(result) || (action.provider === "booking" && !["booked", "not_yet"].includes(result))) return false;
  if (result !== "not_yet" && (confirmed !== true || !hasExternalBookingDetails(action))) return false;
  recordEvent(db, boardId, "user_action", {
    action: "external_result",
    action_id: action.id,
    provider: action.provider,
    result,
    // 카드에 보여 준 조건(날짜·지점·인원 등)을 함께 남긴다. 이용자가 사이트에서 바꿨을 수 있어 "카드의 조건"일 뿐이다
    conditions: action.summary.slice(0, 8),
    source: "user",
  });
  return true;
}

export function externalResults(db: Db, boardId: string): Record<string, ExternalResult> {
  const out: Record<string, ExternalResult> = {};
  for (const event of listEvents(db, boardId)) {
    if (event.kind === "user_action" && event.detail.action === "external_result" && typeof event.detail.action_id === "string") {
      out[event.detail.action_id] = event.detail.result as ExternalResult;
    }
  }
  return out;
}
