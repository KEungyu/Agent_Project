import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { LlmRefusalError, type LlmClient, type LlmRequest, type StructuredRequest } from "./llm";

// Google Gemini API(generateContent, REST)를 마중이의 LlmClient 모양으로 감싼다.
// 에이전트 루프는 Anthropic 메시지 모양(text·tool_use·tool_result 블록)을 쓰므로, 여기서 서로 옮겨 준다.
// 새 패키지 없이 fetch로 호출한다. 키는 .env의 GEMINI_API_KEY에서만 읽는다.

// 시연에서는 답이 빨라야 해서 가장 빠른 무료 모델을 기본으로 둔다 (측정: 3.1-flash-lite 약 3초, 3.5-flash 약 8초).
// gemini-3.8-flash는 무료 등급이 모델당 하루 20회라 금방 바닥나 맨 뒤 예비로 둔다.
export const GEMINI_MODEL_DEFAULT = "gemini-3.1-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
};
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

export class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Gemini API error ${status}: ${detail}`);
    this.name = "GeminiApiError";
  }

  // 붐빔(429)·일시 장애(500·503·504)처럼 잠시 뒤 다시 하면 되는 오류
  get busy(): boolean {
    return RETRYABLE.has(this.status);
  }
}

const RETRYABLE = new Set([429, 500, 503, 504]);
// 기본 모델이 붐비면 차례로 넘어갈 무료 등급 모델 (.env의 GEMINI_FALLBACK_MODELS로 바꿀 수 있다)
export const GEMINI_FALLBACKS_DEFAULT = ["gemini-3.5-flash", "gemini-3.8-flash"];
const RETRY_DELAYS_MS = [700];
const REQUEST_TIMEOUT_MS = 25_000;

// 한도를 넘긴(429) 모델은 한동안 건너뛴다. 하루 한도면 1시간, 분당 한도면 서버가 알려준 대기 시간(최소 1분).
// 개발 서버의 모듈 재로딩에도 남도록 globalThis에 둔다.
const cooldowns = ((globalThis as { __majungiGeminiCooldowns?: Map<string, number> }).__majungiGeminiCooldowns ??= new Map());

function cooldownMs(detail: string): number {
  if (/PerDay/i.test(detail)) return 60 * 60_000;
  const retry = /"retryDelay"\s*:\s*"(\d+)s"/.exec(detail);
  return Math.max(60_000, retry ? Number(retry[1]) * 1000 : 0);
}

export function resetGeminiCooldowns() {
  cooldowns.clear();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fallbackModels(primary: string): string[] {
  const configured = process.env.GEMINI_FALLBACK_MODELS?.split(",").map((name) => name.trim()).filter(Boolean);
  return [primary, ...(configured ?? GEMINI_FALLBACKS_DEFAULT)].filter((name, i, all) => all.indexOf(name) === i);
}

// 루프가 tool_use 블록에 붙여 둔 thoughtSignature (Gemini가 함수 호출과 함께 돌려준 값을 다음 요청에 그대로 돌려줘야 한다)
type SignedToolUse = Anthropic.Beta.BetaToolUseBlock & { thought_signature?: string };

const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

function jsonSchema(schema: unknown): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = (schema ?? {}) as Record<string, unknown>;
  return rest;
}

// Anthropic 모양 대화 → Gemini contents
export function toGeminiContents(messages: Anthropic.Beta.BetaMessageParam[]): GeminiContent[] {
  const toolNames = new Map<string, string>();
  return messages.map((message) => {
    const role = message.role === "assistant" ? "model" : "user";
    if (typeof message.content === "string") return { role, parts: [{ text: message.content }] };
    const parts: GeminiPart[] = [];
    for (const block of message.content) {
      if (block.type === "text") {
        if (block.text) parts.push({ text: block.text });
      } else if (block.type === "tool_use") {
        const use = block as SignedToolUse;
        toolNames.set(use.id, use.name);
        parts.push({
          functionCall: { id: use.id, name: use.name, args: (use.input ?? {}) as Record<string, unknown> },
          ...(use.thought_signature ? { thoughtSignature: use.thought_signature } : {}),
        });
      } else if (block.type === "tool_result") {
        const name = toolNames.get(block.tool_use_id) ?? "unknown_tool";
        const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
        let output: unknown = content;
        try {
          output = JSON.parse(content);
        } catch {
          // 문자열 그대로 둔다
        }
        parts.push({
          functionResponse: {
            id: block.tool_use_id,
            name,
            response: block.is_error ? { error: output } : { output },
          },
        });
      }
      // thinking 등 나머지 블록은 Gemini로 보내지 않는다
    }
    return { role, parts: parts.length ? parts : [{ text: "" }] };
  });
}

// Gemini 응답 → Anthropic 모양 메시지 (루프가 쓰는 content와 stop_reason만 채운다)
export function fromGeminiResponse(data: GeminiResponse, model: string): Anthropic.Beta.BetaMessage {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const content: Anthropic.Beta.BetaContentBlock[] = [];
  let calls = 0;
  for (const part of parts) {
    if (part.thought) continue;
    if (part.functionCall) {
      calls += 1;
      const block: SignedToolUse = {
        type: "tool_use",
        id: part.functionCall.id ?? `gemini_call_${Date.now().toString(36)}_${calls}`,
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
        ...(part.thoughtSignature ? { thought_signature: part.thoughtSignature } : {}),
      } as SignedToolUse;
      content.push(block);
    } else if (part.text) {
      content.push({ type: "text", text: part.text, citations: null } as Anthropic.Beta.BetaTextBlock);
    }
  }
  const reason = candidate?.finishReason ?? "";
  const refused = Boolean(data.promptFeedback?.blockReason) || BLOCKED.has(reason);
  const stop_reason = refused ? "refusal" : reason === "MAX_TOKENS" ? "max_tokens" : calls > 0 ? "tool_use" : "end_turn";
  return { id: "gemini", type: "message", role: "assistant", model, content, stop_reason } as unknown as Anthropic.Beta.BetaMessage;
}

export function createGeminiClient(
  apiKey: string,
  model = process.env.GEMINI_MODEL || GEMINI_MODEL_DEFAULT,
  fetchImpl: typeof fetch = fetch,
  options: { models?: string[]; delays?: number[]; timeoutMs?: number } = {},
): LlmClient {
  const models = options.models ?? fallbackModels(model);
  const delays = options.delays ?? RETRY_DELAYS_MS;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const once = async (name: string, body: Record<string, unknown>): Promise<GeminiResponse> => {
    let response: Response;
    try {
      response = await fetchImpl(`${ENDPOINT}/${name}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        // 서버가 답을 안 주면 하염없이 기다리지 않고, 붐빔(504)으로 보고 다음 모델로 넘어간다
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if ((error as Error).name === "TimeoutError" || (error as Error).name === "AbortError") {
        throw new GeminiApiError(504, `${name} did not answer within ${timeoutMs / 1000}s`);
      }
      throw error;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) cooldowns.set(name, Date.now() + cooldownMs(detail));
      throw new GeminiApiError(response.status, detail.slice(0, 300));
    }
    return (await response.json()) as GeminiResponse;
  };

  // 한도 초과(429)면 바로 다음 모델로, 붐빔(5xx)이면 잠깐 기다렸다 한 번 더 한 뒤 다음 모델로 넘어간다.
  // 키·요청 오류(400·401·403)는 바로 알린다. 한도에 걸려 쉬는 중인 모델은 건너뛴다(모두 쉬는 중이면 그래도 시도한다).
  const call = async (body: Record<string, unknown>): Promise<GeminiResponse> => {
    let last: unknown;
    const now = Date.now();
    const ready = models.filter((name) => (cooldowns.get(name) ?? 0) <= now);
    for (const name of ready.length ? ready : models) {
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          return await once(name, body);
        } catch (error) {
          last = error;
          if (!(error instanceof GeminiApiError)) throw error;
          if (error.status === 404 || error.status === 429) break; // 쓸 수 없거나 한도를 넘긴 모델은 바로 다음 모델로
          if (!error.busy) throw error;
          console.warn(`[gemini] ${name} busy (${error.status}), ${attempt < delays.length ? "retrying" : "trying next model"}`);
          if (attempt < delays.length) await sleep(delays[attempt]);
        }
      }
    }
    throw last;
  };

  return {
    create: async ({ system, tools, messages }: LlmRequest) => {
      const data = await call({
        systemInstruction: { parts: [{ text: system }] },
        contents: toGeminiContents(messages),
        tools: tools.length
          ? [
              {
                functionDeclarations: tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parametersJsonSchema: jsonSchema(tool.input_schema),
                })),
              },
            ]
          : undefined,
      });
      return fromGeminiResponse(data, model);
    },

    structured: async <T>({ system, prompt, schema }: StructuredRequest<T>) => {
      const data = await call({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema(z.toJSONSchema(schema)) },
      });
      const message = fromGeminiResponse(data, model);
      if (message.stop_reason === "refusal") throw new LlmRefusalError();
      const text = message.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      if (!text) throw new Error(`structured output missing (stop_reason: ${message.stop_reason})`);
      return schema.parse(JSON.parse(text));
    },
  };
}
