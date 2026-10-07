import type { RequestStatus } from "../board/types";

// 화면(클라이언트)에서도 쓰는 부분만 둔다. DB에 닿는 로직은 followup.ts에 있다.
export type FollowUpKind = "accept" | "reply" | "provide_info" | "phone";

export function followUpsFor(status: RequestStatus): FollowUpKind[] {
  // 조건부: 먼저 호텔에 답장(조건 동의를 알림)을 권하고, 완료는 이용자가 조건을 실제로 마쳤다고 확인할 때만 (accept)
  if (status === "conditional") return ["reply", "accept"];
  if (status === "info_requested") return ["provide_info"];
  if (status === "declined") return ["phone"];
  return [];
}
