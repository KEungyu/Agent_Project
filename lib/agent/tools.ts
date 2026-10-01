import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { addStay, getBoard, updateBoard, updateStay } from "../board/store";
import type { StayFields } from "../board/types";
import type { Db } from "../db/client";

export type ToolContext = { db: Db; boardId: string };

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
  run: ({ field }, { db, boardId }) => {
    const board = getBoard(db, boardId);
    if (!board) throw new Error(`board not found: ${boardId}`);
    return field ? { [field]: board[field] ?? null } : board;
  },
});

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
  .partial();

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
    arrival: z.object({ datetime: DATETIME, airport: z.string().min(2), flight_no: z.string().optional() }).optional(),
    departure: z
      .object({ datetime: DATETIME, airport: z.string().min(2).optional(), flight_no: z.string().optional() })
      .optional(),
  }),
  run: ({ source, stay_id, stay, arrival, departure }, { db, boardId }) => {
    if (arrival || departure) updateBoard(db, boardId, { ...(arrival && { arrival }), ...(departure && { departure }) });
    let savedStayId = stay_id;
    if (stay && stay_id) {
      updateStay(db, stay_id, stay, source);
    } else if (stay) {
      if (!stay.name) throw new Error("stay.name is required to add a new stay");
      savedStayId = addStay(db, boardId, stay as StayFields, source).id;
    }
    return { saved: true, ...(savedStayId ? { stay_id: savedStayId } : {}) };
  },
});
