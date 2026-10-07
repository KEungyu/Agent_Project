import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { addStay, getBoard, updateBoard, updateStay } from "../board/store";
import { overlapsWithOthers } from "../board/overlap";
import type { StayFields } from "../board/types";
import type { Db } from "../db/client";
import type { LlmClient } from "./llm";

// now: 채널 판단 등 시각에 따른 판단을 테스트에서 고정하기 위해 바꿀 수 있다
// latestUserText: 이번 턴에 이용자가 쓴 문장. "오늘"처럼 날짜를 정하는 말을 코드로 확인할 때만 쓴다
export type ToolContext = { db: Db; boardId: string; llm: LlmClient; now?: () => Date; latestUserText?: string };

// "오늘 새벽 2시"처럼 오늘에 묶은 시각이 이미 지났으면 날짜를 추측하지 말고 먼저 확인받는다.
// "오늘 밤", "tonight"처럼 자정 이후를 뜻하는 말이면 그대로 진행한다.
const TODAY_WORDS = /오늘|today|今日|今天|hôm nay|วันนี้|hari ini|\bhoy\b/i;
const TONIGHT_WORDS = /오늘\s*밤|tonight|今夜|今晚|đêm nay|คืนนี้|malam ini|esta noche/i;

export function needsDateConfirmation(expectedArrival: string, userText: string | undefined, now: Date): string | undefined {
  if (!userText || !TODAY_WORDS.test(userText) || TONIGHT_WORDS.test(userText)) return undefined;
  const kst = (date: Date) => new Date(date.getTime() + 9 * 3_600_000).toISOString();
  const arrival = kst(new Date(expectedArrival));
  const today = kst(now);
  // 오늘 날짜가 아닌 날로 저장하려 하고, 그 시각(시:분)이 오늘은 이미 지났다 = "오늘"을 다음 날로 옮긴 경우
  if (arrival.slice(0, 10) === today.slice(0, 10) || arrival.slice(11, 16) >= today.slice(11, 16)) return undefined;
  return `${arrival.slice(0, 10)} ${arrival.slice(11, 16)} KST`;
}

export type AgentTool<Input = unknown> = {
  name: string;
  description: string;
  input: z.ZodType<Input>;
  run(input: Input, ctx: ToolContext): unknown | Promise<unknown>;
  // true면 실행 후 루프를 멈추고 이용자의 답을 기다린다. run은 { reply: string }을 돌려준다.
  endsTurn?: boolean;
};

export function defineTool<Input>(tool: AgentTool<Input>): AgentTool {
  return tool as AgentTool;
}

export function toApiTool(tool: AgentTool): Anthropic.Beta.BetaTool {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.input) as Record<string, unknown>;
  return {
    name: tool.name,
    description: tool.description,
    input_schema: schema as Anthropic.Beta.BetaTool.InputSchema,
  };
}

const BOARD_FIELDS = ["arrival", "departure", "stays", "itinerary", "requests"] as const;

export const boardGet = defineTool({
  name: "board_get",
  description:
    "Read the traveler's trip board (arrival, departure, stays, itinerary, requests). " +
    "Always check the board before asking the traveler for information. " +
    "Pass `field` to read one section only; omit it to read the whole board.",
  input: z.object({ field: z.enum(BOARD_FIELDS).optional() }),
  run: ({ field }, { db, boardId, now }) => {
    const board = getBoard(db, boardId);
    if (!board) throw new Error(`board not found: ${boardId}`);
    // 지금 한국 시각을 함께 준다: "새벽 2시"처럼 날짜 없이 말한 시각을 어느 날로 볼지 정할 때 쓴다
    const now_kst = koreaNow(now?.() ?? new Date());
    return field ? { now_kst, [field]: board[field] ?? null } : { now_kst, ...board };
  },
});

// "2026-10-02T07:30+09:00 (Friday)"
export function koreaNow(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 3_600_000);
  const weekday = kst.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${kst.toISOString().slice(0, 16)}+09:00 (${weekday})`;
}

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const DATETIME = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/, "ISO 8601 with offset, e.g. 2026-10-20T01:30+09:00");
const TIME = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM");

const stayFields = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(3),
    booking_ref: z.string().min(1),
    guest_name: z.string().min(1),
    check_in_date: DATE,
    check_out_date: DATE,
    expected_arrival: DATETIME,
    checkin_cutoff: TIME,
    checkout_time: TIME,
  })
  .partial()
  .strict();

export const boardUpdate = defineTool({
  name: "board_update",
  description:
    "Save facts to the trip board so they never have to be asked again. " +
    "Use source 'user' for what the traveler told you and 'extracted' for what you read from pasted booking text. " +
    "To change a stay pass stay_id; to add a new stay omit stay_id and include stay.name. " +
    "Times are Korea time with offset, e.g. 2026-10-20T01:30+09:00. Never store passport or card numbers.",
  input: z.object({
    source: z.enum(["user", "extracted"]),
    stay_id: z.string().optional(),
    stay: stayFields.optional(),
    confirm_overlap: z
      .boolean()
      .optional()
      .describe("true only after the traveler confirmed that both stays with overlapping dates are right"),
    arrival: z.object({ datetime: DATETIME, airport: z.string().min(2), flight_no: z.string().optional() }).optional(),
    departure: z
      .object({ datetime: DATETIME, airport: z.string().min(2).optional(), flight_no: z.string().optional() })
      .optional(),
  })
  // 모르는 키(예: stay 밖의 expected_arrival)를 조용히 버리고 "저장됨"이라고 답하지 않도록 거부한다
  .strict(),
  run: ({ source, stay_id, stay, arrival, departure, confirm_overlap }, { db, boardId, now, latestUserText }) => {
    const proposed = stay?.expected_arrival && needsDateConfirmation(stay.expected_arrival, latestUserText, now?.() ?? new Date());
    // 오류가 아니라 "저장하지 않음 + 확인할 날짜"로 돌려준다: 오류로 돌리면 모델이 같은 저장을 되풀이하다 멈출 수 있다
    if (proposed) {
      return {
        saved: false,
        confirm_first: proposed,
        next_step: `Nothing was saved. Reply now with exactly one question asking whether their hotel arrival is ${proposed}. Use only that absolute date and time; do not repeat today or ask about drafting/check-in. Do not call other tools until they answer.`,
      };
    }
    // 날짜가 다른 숙소와 겹치면 저장 전에 이용자에게 확인한다 (B07). 중복 예약인지, 일정이 바뀐 것인지 앱이 단정하지 않는다
    if (stay && (stay.check_in_date || stay.check_out_date) && !confirm_overlap) {
      const stays = getBoard(db, boardId)?.stays ?? [];
      const target = stay_id
        ? stays.find((candidate) => candidate.id === stay_id)
        : stays.find((candidate) => candidate.name.trim().toLowerCase() === stay.name?.trim().toLowerCase());
      const merged = { id: target?.id, name: stay.name ?? target?.name ?? "", check_in_date: stay.check_in_date ?? target?.check_in_date, check_out_date: stay.check_out_date ?? target?.check_out_date };
      const overlaps = overlapsWithOthers(merged, stays);
      if (overlaps.length) {
        return {
          saved: false,
          overlap: overlaps,
          next_step: `Nothing was saved. These dates overlap another stay on the board (${overlaps.map((o) => `${o.b}: ${o.from} to ${o.to}`).join("; ")}). Ask the traveler whether they really keep both bookings or whether one changed. Save again with confirm_overlap: true only after they confirm both are right.`,
        };
      }
    }
    if (arrival || departure) updateBoard(db, boardId, { ...(arrival && { arrival }), ...(departure && { departure }) });
    let savedStayId = stay_id;
    if (stay && stay_id) {
      updateStay(db, stay_id, stay, source);
    } else if (stay) {
      if (!stay.name) throw new Error("stay.name is required to add a new stay");
      // stay_id 없이 같은 이름을 다시 넣으면 새 숙소를 만들지 않고 그 숙소를 고친다 (예약 정보가 빈 두 번째 숙소가 생기지 않게)
      const existing = getBoard(db, boardId)?.stays ?? [];
      const same = existing.find((candidate) => candidate.name.trim().toLowerCase() === stay.name!.trim().toLowerCase());
      if (same) {
        updateStay(db, same.id, stay, source);
        savedStayId = same.id;
      } else if (existing.length > 0 && !stay.check_in_date) {
        throw new Error(
          `To change a stay already on the board, pass its stay_id (${existing.map((s) => `${s.id} = ${s.name}`).join("; ")}). A new stay needs its name and check-in date.`,
        );
      } else {
        savedStayId = addStay(db, boardId, stay as StayFields, source).id;
      }
    }
    return { saved: true, ...(savedStayId ? { stay_id: savedStayId } : {}) };
  },
});
