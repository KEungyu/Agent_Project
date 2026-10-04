import { z } from "zod";
import { getBoard, recordEvent } from "../board/store";
import { fmt, getMessages } from "../i18n/messages";
import { checkConditions } from "../requests/conditions";
import { decideChannel } from "../requests/channel";
import { composeDraft } from "../requests/drafting";
import { createRequest, setRequestChannel, transition } from "../requests/state";
import { requestChanges } from "../requests/approval";
import { requestFacts } from "../requests/facts";
import type { RequestType } from "../request-types/schema";
import { defineTool, type AgentTool, type ToolContext } from "./tools";

// 장소(식당) 요청에서 provided로 받아 요청에 함께 담는 값: 확인된 지점·연락처, 요청 사항(알레르기 등)
const PLACE_EXTRAS = ["place_branch", "place_email", "place_phone", "request_detail"];
const pickRequestDetail = (extras: Record<string, string>): Record<string, string> =>
  extras.request_detail ? { request_detail: extras.request_detail } : {};

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
              "Before asking, look at what the traveler already said in this conversation. Save any of these missing details they gave, even loosely (today, tonight, 2 AM), with board_update and check again; if a time tied to today has already passed, confirm the date first. Use ask_user only for what is still unknown.",
          }
        : {
            ...check,
            next_step:
              type_id && types.find((t) => t.id === type_id)?.target === "place"
                ? "Nothing is missing. Call draft_request now, with the restaurant contact the traveler gave in provided.place_email or provided.place_phone, the branch in provided.place_branch and notes such as allergies copied exactly in provided.request_detail."
                : "Nothing is missing. Call draft_request now.",
          };
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
      // 식당처럼 보드에 없는 장소는 이용자가 알려 준 그 지점의 연락처·요청 사항을 요청에 함께 담는다.
      // 숙소 연락처를 다른 업체에 다시 쓰지 않는다
      const extras = Object.fromEntries(
        Object.entries(provided ?? {}).filter(([key, value]) => PLACE_EXTRAS.includes(key) && value.trim()),
      );
      const slots: Record<string, string> = { ...check.filled, ...(type.target === "place" ? extras : pickRequestDetail(extras)) };
      const where = stay?.name ?? slots.place_name ?? messages.agent.theBusiness;
      const decision = decideChannel(type, stay, slots, ctx.now?.() ?? new Date());
      if (!decision.channel) {
        throw new Error(
          type.target === "place"
            ? "No email or phone for this place in provided. If the traveler gave the restaurant's email or phone in this conversation, call draft_request again with it in provided.place_email or provided.place_phone (and the branch in provided.place_branch). Use exactly what they gave; do not judge whether it looks official. Only if they gave none, ask them; never make one up and never use the hotel's."
            : "No email or phone number for this business on the board. Ask the traveler for one and save it with board_update.",
        );
      }

      const sameTarget = (request: (typeof board.requests)[number]) =>
        request.type_id === type_id &&
        (type.target === "place" ? request.slots.place_name === slots.place_name : request.target_id === check.target_id);
      // 답을 기다리는 같은 신청이 있으면 다른 채널로 다시 신청하지 않는다: 그 결과부터 확인한다
      const waiting = board.requests.find((request) => sameTarget(request) && (request.status === "sent" || request.status === "awaiting_reply"));
      if (waiting) {
        throw new Error(
          `A ${type_id} request to ${where} is already waiting for a reply (request card). Tell the traveler to check or paste that reply first; do not start another request or channel for it.`,
        );
      }
      const open = board.requests.find((request) => sameTarget(request) && (request.status === "draft" || request.status === "pending_approval"));
      // 승인 대기 초안이 있는데 이용자가 고쳐 달라고 하면 같은 요청의 초안을 바꾼다(새 요청을 만들지 않는다).
      // 새 초안이 만들어진 뒤에만 기존 초안을 바꾸므로, 다시 쓰기에 실패해도 승인 대기 중인 초안은 그대로 남는다.
      const revising = open?.status === "pending_approval";
      if (revising && !revision_note) {
        throw new Error(
          `A draft is already waiting for the traveler's approval (request ${open.id}). To change it, call draft_request again with revision_note.`,
        );
      }

      // 이메일이 있으면 언제나 메일 초안을 만들어 요청 카드에서 승인받는다. 시간이 촉박하면 카드에 전화 대본도 함께 띄운다.
      // 이메일이 없을 때만 전화로 간다: 앱은 전화를 걸지 않고, 요청 카드에 읽을 대본을 보여준다 (준비 단계, 승인·발송 없음).
      if (!(stay?.email ?? slots.place_email)) {
        const request =
          open ?? createRequest(ctx.db, { boardId: ctx.boardId, typeId: type_id, targetId: check.target_id, slots }, "agent");
        setRequestChannel(ctx.db, request.id, "phone");
        return { reply: fmt(messages.agent.phoneNoEmail, { where }), request_id: request.id, channel: "phone", reason: decision.reason };
      }

      // 초안을 먼저 쓴 뒤에 요청을 만들거나 바꾼다: 초안 작성에 실패하면 빈 요청 카드가 남지 않는다
      const { draft, checks } = await composeDraft(ctx.llm, type, slots, board.user_language, revision_note, revising ? open.draft : undefined);
      if (revising) requestChanges(ctx.db, open.id, revision_note!);
      const request = open ?? createRequest(ctx.db, { boardId: ctx.boardId, typeId: type_id, targetId: check.target_id, slots }, "agent");
      transition(ctx.db, request.id, "pending_approval", "agent", { patch: { draft, slots, channel: "email" } });

      const callToo = decision.reason === "deadline_soon";
      // 마중이가 해석·저장한 날짜와 시각을 답에 함께 밝혀, 틀렸으면 승인 전에 바로 알 수 있게 한다
      const factsLine = requestFacts(slots, board.user_language, messages.approval)
        .map((fact) => `${fact.label}: ${fact.value}`)
        .join(" · ");
      const intro = revising
        ? fmt(messages.agent.redrafted, { where })
        : callToo
          ? fmt(messages.agent.phoneSoon, { hours: decision.hours_left ?? "", where })
          : decision.reason === "no_phone_but_urgent"
            ? `${fmt(messages.agent.drafted, { where })}\n${fmt(messages.agent.noPhoneUrgent, { hours: decision.hours_left ?? "", where })}`
            : fmt(messages.agent.drafted, { where });
      return {
        reply: factsLine ? `${intro}\n${factsLine}` : intro,
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
