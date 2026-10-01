import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getBoard } from "../board/store";
import type { Db } from "../db/client";

export type ToolContext = { db: Db; boardId: string };

export type AgentTool<Input = unknown> = {
  name: string;
  description: string;
  input: z.ZodType<Input>;
  run(input: Input, ctx: ToolContext): unknown | Promise<unknown>;
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

export const DEFAULT_TOOLS: AgentTool[] = [boardGet];
