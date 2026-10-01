import type Anthropic from "@anthropic-ai/sdk";
import { vi } from "vitest";
import type { LlmClient, LlmRequest, StructuredRequest } from "./llm";

// 테스트 전용: 정해진 응답을 순서대로 돌려주는 가짜 LLM

type Turn = Anthropic.Beta.BetaMessage | ((request: LlmRequest) => Anthropic.Beta.BetaMessage);

export function message(content: object[], stop_reason: string): Anthropic.Beta.BetaMessage {
  return { content, stop_reason } as unknown as Anthropic.Beta.BetaMessage;
}
export const toolUse = (id: string, name: string, input: object = {}) => ({ type: "tool_use", id, name, input });
export const text = (value: string) => ({ type: "text", text: value });

// structured() 요청이 어떤 스키마를 요구하는지 구분할 때 쓴다 (예: "coverage"가 있으면 초안 작성)
export function schemaHas(request: StructuredRequest<unknown>, key: string): boolean {
  return key in (request.schema as unknown as { shape: object }).shape;
}

export function fakeLlm(
  turns: Turn[] = [],
  structured: (request: StructuredRequest<unknown>) => unknown = () => {
    throw new Error("structured() not scripted");
  },
) {
  const queue = [...turns];
  return {
    create: vi.fn(async (request: LlmRequest) => {
      const next = queue.shift();
      if (!next) throw new Error("no more scripted turns");
      return typeof next === "function" ? next(request) : next;
    }),
    structured: vi.fn(async (request: StructuredRequest<unknown>) => structured(request)),
  } as LlmClient & { create: ReturnType<typeof vi.fn>; structured: ReturnType<typeof vi.fn> };
}
