import type { RequestStatus } from "../board/types";

// 화면(클라이언트)에서도 쓰는 부분만 둔다. DB에 닿는 로직은 followup.ts에 있다.
export type FollowUpKind = "accept" | "reply" | "provide_info" | "phone";

export function followUpsFor(status: RequestStatus): FollowUpKind[] {
  if (status === "conditional") return ["accept", "reply"];
  if (status === "info_requested") return ["provide_info"];
  if (status === "declined") return ["phone"];
  return [];
}
