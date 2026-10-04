import Anthropic from "@anthropic-ai/sdk";
import { recordEvent } from "../board/store";
import type { Db } from "../db/client";
import { getMessages } from "../i18n/messages";
import { isExternalAction, type ExternalAction } from "../external/links";
import { checkSafety } from "../safety/guard";
import { getConversation, setConversation } from "./conversation";
import { GeminiApiError } from "./gemini";
import { MissingApiKeyError, type LlmClient } from "./llm";
import { runAgent } from "./loop";
import { createTools } from "./registry";

export type TurnResult =
  | { ok: true; reply: string; tools: { name: string; ok: boolean }[]; actions?: ExternalAction[] }
  | { ok: true; safety: "emergency" | "out_of_scope" }
  | { ok: false; error: string };

// 채팅 한 턴: 안전 가드 → (통과하면) 에이전트 루프. 긴급·행정 질문이면 루프를 실행하지 않는다.
export async function runTurn({
  db,
  boardId,
  language,
  text,
  createLlm,
}: {
  db: Db;
  boardId: string;
  language: string;
  text: string;
  createLlm: () => LlmClient;
}): Promise<TurnResult> {
  recordEvent(db, boardId, "user_action", { action: "chat" });

  const verdict = checkSafety(text);
  if (verdict !== "ok") {
    recordEvent(db, boardId, "user_action", { action: "safety_guard", verdict, agent_loop: "not_run" });
    return { ok: true, safety: verdict };
  }

  try {
    const result = await runAgent({
      llm: createLlm(),
      tools: createTools(),
      ctx: { db, boardId, latestUserText: text },
      language,
      messages: [...getConversation(boardId), { role: "user", content: text }],
    });
    // 도구가 만든 답(질문·초안 안내·전화 대본)이나 중단 안내는 모델의 글로 남지 않으므로,
    // 대화 기록 끝에 마중이의 말로 붙여 둔다. 그래야 화면을 다시 그려도 답이 사라지지 않는다.
    const last = result.messages.at(-1);
    const messages =
      result.reply && last?.role === "user"
        ? [...result.messages, { role: "assistant" as const, content: [{ type: "text" as const, text: result.reply }] }]
        : result.messages;
    setConversation(boardId, messages);
    // 외부 연결 행동(Booking.com·Catchtable)은 검증한 것만 화면에 넘긴다
    const actions = result.toolCalls.flatMap((call) => {
      const action = call.ok ? (call.output as { action?: unknown } | null)?.action : undefined;
      return isExternalAction(action) ? [action] : [];
    });
    return { ok: true, reply: result.reply, tools: result.toolCalls.map(({ name, ok }) => ({ name, ok })), ...(actions.length ? { actions } : {}) };
  } catch (error) {
    if (error instanceof MissingApiKeyError) return { ok: false, error: error.message };
    if (error instanceof Anthropic.APIError) {
      // 여행자에게는 이용자 언어 안내와 다음 행동만 보이고, 원인(요금·인증 등)은 서버 로그에만 남긴다
      console.error(`[agent] Claude API error ${error.status}: ${error.message}`);
      return { ok: false, error: getMessages(language).chat.unavailable };
    }
    if (error instanceof GeminiApiError) {
      console.error(`[agent] ${error.message}`);
      const chat = getMessages(language).chat;
      return { ok: false, error: error.busy ? chat.busy : chat.unavailable };
    }
    throw error;
  }
}
