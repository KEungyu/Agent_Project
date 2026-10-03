import { z } from "zod";
import { getBoard, recordEvent } from "../board/store";
import { fmt, getMessages } from "../i18n/messages";
import { checkConditions } from "../requests/conditions";
import { decideChannel, formatPhoneScript, makePhoneScript } from "../requests/channel";
import { composeDraft } from "../requests/drafting";
import { createRequest, setRequestChannel, transition } from "../requests/state";
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
      checkConditions(typeOf(types, type_id), boardOf(ctx), { targetId: target_id, provided, now: ctx.now?.() }),
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
      const board = boardOf(ctx);
      const check = checkConditions(typeOf(types, type_id), board, { targetId: target_id, now: ctx.now?.() });
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
        reply: [getMessages(board.user_language).agent.askIntro, ...questions.map((slot) => `- ${slot.question}`)].join("\n"),
        asked: questions.map((slot) => slot.key),
      };
    },
  });

  const draftRequest = defineTool({
    name: "draft_request",
    description:
      "Write the Korean message for a request, translate it back into the traveler's language, and show both to the traveler for approval. " +
      "Call only after check_conditions reports nothing missing. Nothing is sent by this tool; sending happens only after the traveler approves.",
    endsTurn: true,
    input: z.object({
      type_id: typeId,
      target_id: z.string().optional(),
      provided: z.record(z.string(), z.string()).optional(),
      revision_note: z.string().optional().describe("the traveler's requested changes when redrafting"),
    }),
    run: async ({ type_id, target_id, provided, revision_note }, ctx) => {
      const type = typeOf(types, type_id);
      const board = boardOf(ctx);
      const check = checkConditions(type, board, { targetId: target_id, provided, now: ctx.now?.() });
      if (check.missing.length > 0) {
        throw new Error(`Missing details: ${check.missing.map((slot) => slot.key).join(", ")}. Call ask_user first.`);
      }

      const messages = getMessages(board.user_language);
      const stay = board.stays.find((candidate) => candidate.id === check.target_id);
      const where = stay?.name ?? messages.agent.theBusiness;
      const decision = decideChannel(type, stay, check.filled, ctx.now?.() ?? new Date());
      if (!decision.channel) {
        throw new Error("No email or phone number for this business on the board. Ask the traveler for one and save it with board_update.");
      }

      const open = board.requests.find(
        (request) =>
          request.type_id === type_id &&
          request.target_id === check.target_id &&
          (request.status === "draft" || request.status === "pending_approval"),
      );
      if (open?.status === "pending_approval") {
        throw new Error(`A draft is already waiting for the traveler's approval (request ${open.id}).`);
      }
      const request =
        open ??
        createRequest(
          ctx.db,
          { boardId: ctx.boardId, typeId: type_id, targetId: check.target_id, slots: check.filled },
          "agent",
        );

      if (decision.channel === "phone") {
        // 앱은 전화를 걸지 않는다: 읽을 스크립트만 준비한다 (준비 단계, 승인·발송 없음)
        const script = await makePhoneScript(ctx.llm, type, check.filled, board.user_language);
        setRequestChannel(ctx.db, request.id, "phone");
        const intro =
          decision.reason === "deadline_soon"
            ? fmt(messages.agent.phoneSoon, { hours: decision.hours_left ?? "", where })
            : fmt(messages.agent.phoneNoEmail, { where });
        return { reply: `${intro}\n\n${formatPhoneScript(script)}`, request_id: request.id, channel: "phone", reason: decision.reason };
      }

      const { draft, checks } = await composeDraft(ctx.llm, type, check.filled, board.user_language, revision_note);
      transition(ctx.db, request.id, "pending_approval", "agent", { patch: { draft, slots: check.filled, channel: "email" } });

      return {
        reply: fmt(messages.agent.drafted, { where }),
        request_id: request.id,
        subject_ko: draft.subject_ko,
        body_ko: draft.body_ko,
        back_translation: draft.back_translation,
        checks,
      };
    },
  });

  return [checkConditionsTool, askUser, draftRequest];
}
