import Anthropic from "@anthropic-ai/sdk";
import { recordEvent } from "../board/store";
import type { Db } from "../db/client";
import { checkSafety } from "../safety/guard";
import { getConversation, setConversation } from "./conversation";
import { MissingApiKeyError, type LlmClient } from "./llm";
import { runAgent } from "./loop";
import { createTools } from "./registry";

export type TurnResult =
  | { ok: true; reply: string; tools: { name: string; ok: boolean }[] }
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
      ctx: { db, boardId },
      language,
      messages: [...getConversation(boardId), { role: "user", content: text }],
    });
    setConversation(boardId, result.messages);
    return { ok: true, reply: result.reply, tools: result.toolCalls.map(({ name, ok }) => ({ name, ok })) };
  } catch (error) {
    if (error instanceof MissingApiKeyError) return { ok: false, error: error.message };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Claude API error ${error.status}: ${error.message}` };
    throw error;
  }
}
