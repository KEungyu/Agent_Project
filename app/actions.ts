"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClaudeClient, MissingApiKeyError } from "@/lib/agent/llm";
import { runTurn, type TurnResult } from "@/lib/agent/turn";
import { addItineraryForm, ensureBoard, saveStayForm, saveTripForm } from "@/lib/board/forms";
import { recordEvent, updateBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { isLanguageCode } from "@/lib/i18n/languages";
import { getMessages } from "@/lib/i18n/messages";
import { getMailer } from "@/lib/mail/mailer";
import { approveAndSend, ApprovalError, requestChanges, retranslateDraft } from "@/lib/requests/approval";
import { addReply, applyInterpretation, confirmReplyClass, interpretReply } from "@/lib/requests/replies";
import { getRequest, TransitionError } from "@/lib/requests/state";
import { loadRequestTypes } from "@/lib/request-types/loader";
import type { ReplyClass } from "@/lib/board/types";
import { dismissAlert, type RuleId } from "@/lib/proactive/rules";

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

// 화면 언어이자 마중의 답변·역번역 언어. 레이아웃의 html lang도 바뀌므로 레이아웃까지 다시 그린다.
export async function setLanguage(code: string) {
  if (!isLanguageCode(code)) return;
  const db = getDb();
  const board = ensureBoard(db);
  updateBoard(db, board.id, { user_language: code });
  recordEvent(db, board.id, "user_action", { action: "set_language", language: code });
  revalidatePath("/", "layout");
}

export type ChatResult = TurnResult;

async function runChatTurn(text: string): Promise<ChatResult> {
  const db = getDb();
  const board = ensureBoard(db);
  return runTurn({ db, boardId: board.id, language: board.user_language, text, createLlm: createClaudeClient });
}

export async function sendChat(message: string): Promise<ChatResult> {
  const text = message.trim();
  if (!text) return { ok: false, error: getMessages(ensureBoard(getDb()).user_language).chat.typeMessage };
  const result = await runChatTurn(text);
  revalidatePath("/");
  return result;
}

export type ApprovalResult = { ok: true } | { ok: false; error: string };

export async function approveAndSendAction(requestId: string): Promise<ApprovalResult> {
  try {
    approveAndSend(getDb(), requestId, getMailer());
    return { ok: true };
  } catch (error) {
    if (error instanceof ApprovalError || error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

// 초안으로 되돌린 뒤, 수정 메모를 채팅으로 에이전트에게 넘겨 다시 쓰게 한다
export async function requestChangesAction(requestId: string, note: string): Promise<ChatResult> {
  const db = getDb();
  try {
    requestChanges(db, requestId, note.trim());
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  }
  const request = getRequest(db, requestId)!;
  const result = await runChatTurn(
    `Please redraft my ${request.type_id} message (request ${request.id}) with these changes: ${note.trim() || "make it clearer"}`,
  );
  revalidatePath("/");
  return result;
}

export async function retranslateAction(requestId: string): Promise<ApprovalResult> {
  const db = getDb();
  const board = ensureBoard(db);
  try {
    await retranslateDraft(db, createClaudeClient(), requestId, board.user_language);
    return { ok: true };
  } catch (error) {
    if (error instanceof MissingApiKeyError || error instanceof ApprovalError) return { ok: false, error: error.message };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Claude API error ${error.status}: ${error.message}` };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export type ReplyResult = { ok: true; manual: boolean } | { ok: false; error: string };

// 회신을 저장하고 해석한다. LLM을 쓸 수 없으면 저장만 하고 이용자가 직접 분류하게 한다(manual).
export async function submitReplyAction(requestId: string, rawKo: string): Promise<ReplyResult> {
  const db = getDb();
  try {
    const reply = addReply(db, requestId, rawKo);
    const request = getRequest(db, requestId)!;
    const type = loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
    if (!type) return { ok: true, manual: true };
    try {
      const interpretation = await interpretReply(createClaudeClient(), type, reply.raw_ko, ensureBoard(db).user_language);
      applyInterpretation(db, reply, interpretation);
      return { ok: true, manual: interpretation.needs_user_check };
    } catch (error) {
      if (error instanceof MissingApiKeyError || error instanceof Anthropic.APIError) return { ok: true, manual: true };
      throw error;
    }
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export async function confirmReplyAction(replyId: string, cls: ReplyClass): Promise<ApprovalResult> {
  try {
    confirmReplyClass(getDb(), replyId, cls);
    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export async function dismissAlertAction(ruleId: RuleId, targetId: string) {
  const db = getDb();
  dismissAlert(db, ensureBoard(db), ruleId, targetId, new Date());
  revalidatePath("/");
}
