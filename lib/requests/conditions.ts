import type { Stay, TripBoard } from "../board/types";
import type { RequestType } from "../request-types/schema";

// 요청 유형의 required_slots를 보드와 대조한다 (ARCHITECTURE §3 check_conditions).

export type MissingSlot = { key: string; question: string };
export type ConditionCheck = {
  type_id: string;
  target_id?: string;
  filled: Record<string, string>;
  missing: MissingSlot[];
};

// "stays[target].name" 또는 "stays[0].guest_name"
const BOARD_PATH = /^stays\[(target|\d+)\]\.(\w+)$/;

export function readBoardPath(board: TripBoard, path: string, targetId?: string): string | undefined {
  const match = BOARD_PATH.exec(path);
  if (!match) return undefined;
  const [, index, field] = match;
  const stay = index === "target" ? board.stays.find((s) => s.id === targetId) : board.stays[Number(index)];
  const value = stay?.[field as keyof Stay];
  return typeof value === "string" && value ? value : undefined;
}

// 대상이 숙소인 유형은 숙소가 하나뿐이면 그 숙소를 대상으로 삼는다
export function resolveTargetId(type: RequestType, board: TripBoard, targetId?: string): string | undefined {
  if (targetId || type.target !== "stay") return targetId;
  return board.stays.length === 1 ? board.stays[0].id : undefined;
}

export function checkConditions(
  type: RequestType,
  board: TripBoard,
  options: { targetId?: string; provided?: Record<string, string> } = {},
): ConditionCheck {
  const targetId = resolveTargetId(type, board, options.targetId);
  const filled: Record<string, string> = {};
  const missing: MissingSlot[] = [];

  for (const slot of type.required_slots) {
    const value =
      (slot.from_board ? readBoardPath(board, slot.from_board, targetId) : undefined) ?? options.provided?.[slot.key];
    if (value) filled[slot.key] = value;
    else missing.push({ key: slot.key, question: slot.ask[board.user_language] ?? slot.ask.en });
  }
  return { type_id: type.id, ...(targetId ? { target_id: targetId } : {}), filled, missing };
}
