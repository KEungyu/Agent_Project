"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getConversation, setConversation } from "@/lib/agent/conversation";
import { createClaudeClient, MissingApiKeyError } from "@/lib/agent/llm";
import { runAgent } from "@/lib/agent/loop";
import { DEFAULT_TOOLS } from "@/lib/agent/tools";
import { addItineraryForm, ensureBoard, saveStayForm, saveTripForm } from "@/lib/board/forms";
import { recordEvent } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";

// 로그인 없이 이용자 1명이 쓰는 로컬 앱이다 (ARCHITECTURE A1). 인증 검사는 두지 않는다.

export async function saveTrip(form: FormData) {
  saveTripForm(getDb(), form);
  revalidatePath("/");
}

export async function saveStay(form: FormData) {
  saveStayForm(getDb(), form);
  revalidatePath("/");
}

export async function addItinerary(form: FormData) {
  addItineraryForm(getDb(), form);
  revalidatePath("/");
}

export type ChatResult =
  | { ok: true; reply: string; tools: { name: string; ok: boolean }[] }
  | { ok: false; error: string };

export async function sendChat(message: string): Promise<ChatResult> {
  const text = message.trim();
  if (!text) return { ok: false, error: "Please type a message." };

  const db = getDb();
  const board = ensureBoard(db);
  recordEvent(db, board.id, "user_action", { action: "chat" });

  try {
    const result = await runAgent({
      llm: createClaudeClient(),
      tools: DEFAULT_TOOLS,
      ctx: { db, boardId: board.id },
      messages: [...getConversation(board.id), { role: "user", content: text }],
    });
    setConversation(board.id, result.messages);
    revalidatePath("/");
    return { ok: true, reply: result.reply, tools: result.toolCalls.map(({ name, ok }) => ({ name, ok })) };
  } catch (error) {
    if (error instanceof MissingApiKeyError) return { ok: false, error: error.message };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Claude API error ${error.status}: ${error.message}` };
    throw error;
  }
}
