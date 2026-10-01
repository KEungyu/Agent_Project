import { z } from "zod";
import { getBoard, recordEvent } from "../board/store";
import { checkConditions } from "../requests/conditions";
import type { RequestType } from "../request-types/schema";
import { defineTool, type AgentTool, type ToolContext } from "./tools";

function boardOf({ db, boardId }: ToolContext) {
  const board = getBoard(db, boardId);
  if (!board) throw new Error(`board not found: ${boardId}`);
  return board;
}

function typeOf(types: RequestType[], typeId: string) {
  const type = types.find((candidate) => candidate.id === typeId);
  if (!type) throw new Error(`unknown request type: ${typeId}. Known: ${types.map((t) => t.id).join(", ")}`);
  return type;
}

export function createRequestTools(types: RequestType[]): AgentTool[] {
  const typeList = types.map((type) => `${type.id} (${type.label.en})`).join(", ");
  const typeId = z.enum(types.map((type) => type.id) as [string, ...string[]]);

  const checkConditionsTool = defineTool({
    name: "check_conditions",
    description:
      `Check which details a request needs and which are already on the trip board. Request types: ${typeList}. ` +
      "Call this before drafting any request. `provided` holds values the traveler told you that do not belong on the board.",
    input: z.object({
      type_id: typeId,
      target_id: z.string().optional().describe("stay id the request is about; may be omitted when there is one stay"),
      provided: z.record(z.string(), z.string()).optional(),
    }),
    run: ({ type_id, target_id, provided }, ctx) =>
      checkConditions(typeOf(types, type_id), boardOf(ctx), { targetId: target_id, provided }),
  });

  const askUser = defineTool({
    name: "ask_user",
    description:
      "Ask the traveler for missing details of a request, then wait for the answer. " +
      "Only pass keys that check_conditions reported as missing. Asking for something already on the board is refused.",
    endsTurn: true,
    input: z.object({
      type_id: typeId,
      target_id: z.string().optional(),
      keys: z.array(z.string()).min(1),
    }),
    run: ({ type_id, target_id, keys }, ctx) => {
      const check = checkConditions(typeOf(types, type_id), boardOf(ctx), { targetId: target_id });
      const alreadyKnown = keys.filter((key) => key in check.filled);
      if (alreadyKnown.length > 0) {
        recordEvent(ctx.db, ctx.boardId, "re_ask", { type_id, keys: alreadyKnown });
        throw new Error(
          `Already on the board, do not ask again: ${alreadyKnown.map((key) => `${key}=${check.filled[key]}`).join(", ")}`,
        );
      }
      const questions = check.missing.filter((slot) => keys.includes(slot.key));
      if (questions.length === 0) throw new Error(`None of these keys are missing for ${type_id}: ${keys.join(", ")}`);
      return {
        reply: ["I need a few details first:", ...questions.map((slot) => `- ${slot.question}`)].join("\n"),
        asked: questions.map((slot) => slot.key),
      };
    },
  });

  return [checkConditionsTool, askUser];
}
