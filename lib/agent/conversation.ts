import type Anthropic from "@anthropic-ai/sdk";

// 보드별 대화 기록. MVP에서는 서버 메모리에만 둔다 (서버를 다시 켜면 비워진다).
// 개발 서버의 모듈 재로딩에도 남도록 globalThis에 둔다.
const store = ((globalThis as { __majungConversations?: Map<string, Anthropic.Beta.BetaMessageParam[]> })
  .__majungConversations ??= new Map());

export function getConversation(boardId: string): Anthropic.Beta.BetaMessageParam[] {
  return store.get(boardId) ?? [];
}

export function setConversation(boardId: string, messages: Anthropic.Beta.BetaMessageParam[]) {
  store.set(boardId, messages);
}
