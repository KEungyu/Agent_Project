import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-sonnet-5-5";

export type LlmRequest = {
  system: string;
  tools: Anthropic.Beta.BetaTool[];
  messages: Anthropic.Beta.BetaMessageParam[];
};

export type StructuredRequest<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  effort?: "low" | "medium" | "high";
};

// 테스트에서 가짜 LLM을 끼울 수 있도록 필요한 호출만 노출한다
export type LlmClient = {
  // 에이전트 루프용 (도구 호출)
  create(request: LlmRequest): Promise<Anthropic.Beta.BetaMessage>;
  // 요청문 작성·역번역·회신 해석처럼 정해진 JSON을 돌려받는 단일 호출
  structured<T>(request: StructuredRequest<T>): Promise<T>;
};

export class MissingApiKeyError extends Error {
  constructor(keyName = "ANTHROPIC_API_KEY 또는 GEMINI_API_KEY") {
    super(`${keyName}가 설정되지 않았습니다. 프로젝트 폴더의 .env에 ${keyName}=값 을 넣으세요 (README의 키 이름 표 참고).`);
    this.name = "MissingApiKeyError";
  }
}

export class LlmRefusalError extends Error {
  constructor() {
    super("The model declined this request.");
    this.name = "LlmRefusalError";
  }
}

// 안전 분류기가 거절하면 서버가 다른 모델로 이어서 처리한다
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as const;

export function createClaudeClient(): LlmClient {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError("ANTHROPIC_API_KEY");
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
        ...FALLBACK,
        betas: [...FALLBACK.betas],
      }),

    structured: async ({ system, prompt, schema, effort = "medium" }) => {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: { effort, format: betaZodOutputFormat(schema) },
        ...FALLBACK,
        betas: [...FALLBACK.betas],
      });
      if (response.stop_reason === "refusal") throw new LlmRefusalError();
      if (response.parsed_output == null) throw new Error(`structured output missing (stop_reason: ${response.stop_reason})`);
      return response.parsed_output;
    },
  };
}
