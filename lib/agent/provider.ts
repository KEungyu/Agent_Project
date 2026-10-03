import { createGeminiClient } from "./gemini";
import { createClaudeClient, MissingApiKeyError, type LlmClient } from "./llm";

// 어떤 LLM을 쓸지 .env로 고른다.
// - LLM_PROVIDER=gemini | anthropic 으로 직접 고를 수 있다.
// - 지정하지 않으면 GEMINI_API_KEY가 있을 때 Gemini, 없으면 ANTHROPIC_API_KEY로 Claude를 쓴다.
export type LlmProvider = "gemini" | "anthropic";

export function llmProvider(env: Record<string, string | undefined> = process.env): LlmProvider {
  const chosen = env.LLM_PROVIDER?.trim().toLowerCase();
  if (chosen === "gemini" || chosen === "anthropic") return chosen;
  return env.GEMINI_API_KEY ? "gemini" : "anthropic";
}

export function createLlmClient(): LlmClient {
  if (llmProvider() === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new MissingApiKeyError("GEMINI_API_KEY");
    return createGeminiClient(key);
  }
  return createClaudeClient();
}
