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

// 마감 기준 값(예: 도착 예정 시각)이 이미 지났는지. 날짜만 있으면 그날 한국 시간 24시를 기준으로 본다.
function isPast(value: string, now: Date): boolean {
  const time = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T24:00:00+09:00`) : new Date(value);
  return !Number.isNaN(time.getTime()) && time.getTime() < now.getTime();
}

export function checkConditions(
  type: RequestType,
  board: TripBoard,
  options: { targetId?: string; provided?: Record<string, string>; now?: Date } = {},
): ConditionCheck {
  const targetId = resolveTargetId(type, board, options.targetId);
  const filled: Record<string, string> = {};
  const missing: MissingSlot[] = [];
  const now = options.now ?? new Date();

  for (const slot of type.required_slots) {
    // 이용자가 대화에서 방금 알려준 값이 보드에 저장된 예전 값보다 앞선다
    const value =
      options.provided?.[slot.key] ?? (slot.from_board ? readBoardPath(board, slot.from_board, targetId) : undefined);
    // 마감 기준 값이 이미 지났으면 낡은 값으로 보고 다시 묻는다 (예: 어제 저장한 도착 시각)
    const stale = Boolean(value) && slot.key === type.channel_rule?.deadline_slot && isPast(value!, now);
    if (value && !stale) filled[slot.key] = value;
    else missing.push({ key: slot.key, question: slot.ask[board.user_language] ?? slot.ask.en });
  }
  return { type_id: type.id, ...(targetId ? { target_id: targetId } : {}), filled, missing };
}
