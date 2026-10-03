import { z } from "zod";
import { getBoard, recordEvent } from "../board/store";
import { fmt, getMessages } from "../i18n/messages";
import { checkConditions } from "../requests/conditions";
import { decideChannel } from "../requests/channel";
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
    run: ({ type_id, target_id, provided }, ctx) => {
      const check = checkConditions(typeOf(types, type_id), boardOf(ctx), { targetId: target_id, provided, now: ctx.now?.() });
      // 빠진 값을 바로 묻지 않고, 이용자가 이미 말한 값("오늘", "새벽 1시" 등)부터 저장하도록 결과에 다음 행동을 적어 준다
      return check.missing.length > 0
        ? {
            ...check,
            next_step:
              "Before asking, look at what the traveler already said in this conversation. Save any of these missing details they gave, even loosely (today, tonight, 2 AM), with board_update and check again. Use ask_user only for what is still unknown.",
          }
        : { ...check, next_step: "Nothing is missing. Call draft_request now." };
    },
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
      // 승인 대기 초안이 있는데 이용자가 채팅으로 고쳐 달라고 하면, 그 초안을 되돌려 다시 쓴다(새 요청을 만들지 않는다)
      if (open?.status === "pending_approval") {
        if (!revision_note) {
          throw new Error(
            `A draft is already waiting for the traveler's approval (request ${open.id}). To change it, call draft_request again with revision_note.`,
          );
        }
        recordEvent(ctx.db, ctx.boardId, "user_action", { action: "request_changes", via: "chat" }, open.id);
        transition(ctx.db, open.id, "draft", "user", { note: revision_note });
      }
      const request =
        open ??
        createRequest(
          ctx.db,
          { boardId: ctx.boardId, typeId: type_id, targetId: check.target_id, slots: check.filled },
          "agent",
        );

      // 이메일이 있으면 언제나 메일 초안을 만들어 요청 카드에서 승인받는다. 시간이 촉박하면 카드에 전화 대본도 함께 띄운다.
      // 이메일이 없을 때만 전화로 간다: 앱은 전화를 걸지 않고, 요청 카드에 읽을 대본을 보여준다 (준비 단계, 승인·발송 없음).
      if (!stay?.email) {
        setRequestChannel(ctx.db, request.id, "phone");
        return { reply: fmt(messages.agent.phoneNoEmail, { where }), request_id: request.id, channel: "phone", reason: decision.reason };
      }

      const { draft, checks } = await composeDraft(ctx.llm, type, check.filled, board.user_language, revision_note);
      transition(ctx.db, request.id, "pending_approval", "agent", { patch: { draft, slots: check.filled, channel: "email" } });

      const callToo = decision.reason === "deadline_soon";
      return {
        reply: callToo ? fmt(messages.agent.phoneSoon, { hours: decision.hours_left ?? "", where }) : fmt(messages.agent.drafted, { where }),
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
