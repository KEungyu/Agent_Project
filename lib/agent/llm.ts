import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";

export type LlmRequest = {
  system: string;
  tools: Anthropic.Beta.BetaTool[];
  messages: Anthropic.Beta.BetaMessageParam[];
};

// 테스트에서 가짜 LLM을 끼울 수 있도록 호출 한 가지만 노출한다
export type LlmClient = { create(request: LlmRequest): Promise<Anthropic.Beta.BetaMessage> };

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.example을 .env로 복사한 뒤 값을 채우세요.");
    this.name = "MissingApiKeyError";
  }
}

export function createClaudeClient(): LlmClient {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  const client = new Anthropic();
  return {
    create: ({ system, tools, messages }) =>
      client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system,
        tools,
        messages,
        output_config: { effort: "medium" },
        // 안전 분류기가 거절하면 서버가 다른 모델로 이어서 처리한다
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      }),
  };
}
