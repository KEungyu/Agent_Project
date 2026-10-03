import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createGeminiClient, fromGeminiResponse, resetGeminiCooldowns, toGeminiContents } from "./gemini";
import { LlmRefusalError } from "./llm";
import { llmProvider } from "./provider";

const reply = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });

describe("gemini adapter", () => {
  it("turns a function call into a tool_use block and keeps its thought signature", () => {
    const message = fromGeminiResponse(
      { candidates: [{ content: { parts: [{ text: "Checking." }, { functionCall: { id: "c1", name: "get_board", args: {} }, thoughtSignature: "sig" }] }, finishReason: "STOP" }] },
      "gemini-test",
    );
    expect(message.stop_reason).toBe("tool_use");
    expect(message.content[1]).toMatchObject({ type: "tool_use", id: "c1", name: "get_board", thought_signature: "sig" });
  });

  it("sends tool results back as functionResponse with the original name, id and signature", () => {
    const contents = toGeminiContents([
      { role: "user", content: "What is on my board?" },
      { role: "assistant", content: [{ type: "tool_use", id: "c1", name: "get_board", input: {}, thought_signature: "sig" } as never] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: '{"stays":1}' }] },
    ]);
    expect(contents[1]).toEqual({ role: "model", parts: [{ functionCall: { id: "c1", name: "get_board", args: {} }, thoughtSignature: "sig" }] });
    expect(contents[2].parts[0].functionResponse).toEqual({ id: "c1", name: "get_board", response: { output: { stays: 1 } } });
  });

  it("maps safety blocks to a refusal and length cut-offs to max_tokens", () => {
    expect(fromGeminiResponse({ promptFeedback: { blockReason: "SAFETY" } }, "m").stop_reason).toBe("refusal");
    expect(fromGeminiResponse({ candidates: [{ content: { parts: [{ text: "a" }] }, finishReason: "MAX_TOKENS" }] }, "m").stop_reason).toBe("max_tokens");
  });

  it("asks for JSON with the schema and validates the answer", async () => {
    let sent: Record<string, unknown> = {};
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" }] }));
    }) as typeof fetch;
    const client = createGeminiClient("test-key", "gemini-test", fakeFetch);
    await expect(client.structured({ system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }) })).resolves.toEqual({ ok: true });
    expect(sent.generationConfig).toMatchObject({ responseMimeType: "application/json", responseJsonSchema: { type: "object" } });
  });

  it("raises a refusal for blocked structured calls", async () => {
    const client = createGeminiClient("k", "m", reply({ promptFeedback: { blockReason: "SAFETY" } }) as unknown as typeof fetch);
    await expect(client.structured({ system: "s", prompt: "p", schema: z.object({}) })).rejects.toBeInstanceOf(LlmRefusalError);
  });

  it("picks Gemini when only a Gemini key is set, and honours LLM_PROVIDER", () => {
    expect(llmProvider({ GEMINI_API_KEY: "x" })).toBe("gemini");
    expect(llmProvider({ ANTHROPIC_API_KEY: "x" })).toBe("anthropic");
    expect(llmProvider({ GEMINI_API_KEY: "x", LLM_PROVIDER: "anthropic" })).toBe("anthropic");
  });
});

describe("gemini busy handling", () => {
  const ok = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" }] };
  const busy = () => new Response('{"error":{"code":503}}', { status: 503 });

  it("skips a model that hit its quota, now and on the next call", async () => {
    resetGeminiCooldowns();
    const urls: string[] = [];
    const fakeFetch = (async (url: string) => {
      urls.push(url.split("/models/")[1].split(":")[0]);
      return url.includes("/limited:")
        ? new Response('{"error":{"code":429,"details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}', { status: 429 })
        : new Response(JSON.stringify(ok));
    }) as typeof fetch;
    const client = createGeminiClient("k", "limited", fakeFetch, { models: ["limited", "spare"], delays: [0] });
    const schema = z.object({ ok: z.boolean() });
    await client.structured({ system: "s", prompt: "p", schema });
    await client.structured({ system: "s", prompt: "p", schema });
    expect(urls).toEqual(["limited", "spare", "spare"]);
    resetGeminiCooldowns();
  });

  it("treats a model that never answers as busy and moves on", async () => {
    const hanging = (async (url: string, init: RequestInit) => {
      if (url.includes("/slow:")) {
        return new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
      }
      return new Response(JSON.stringify(ok));
    }) as typeof fetch;
    const client = createGeminiClient("k", "slow", hanging, { models: ["slow", "fast"], delays: [], timeoutMs: 20 });
    await expect(client.structured({ system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }) })).resolves.toEqual({ ok: true });
  });

  it("retries a busy model, then falls back to the next model", async () => {
    const urls: string[] = [];
    const responses = [busy(), busy(), new Response(JSON.stringify(ok))];
    const fakeFetch = (async (url: string) => {
      urls.push(url);
      return responses.shift()!;
    }) as typeof fetch;
    const client = createGeminiClient("k", "main", fakeFetch, { models: ["main", "backup"], delays: [0] });
    await expect(client.structured({ system: "s", prompt: "p", schema: z.object({ ok: z.boolean() }) })).resolves.toEqual({ ok: true });
    expect(urls.map((url) => url.split("/models/")[1].split(":")[0])).toEqual(["main", "main", "backup"]);
  });

  it("gives up with a busy error when every model stays busy, and does not retry key errors", async () => {
    const allBusy = createGeminiClient("k", "a", (async () => busy()) as typeof fetch, { models: ["a", "b"], delays: [0] });
    const error = await allBusy.structured({ system: "s", prompt: "p", schema: z.object({}) }).catch((caught) => caught);
    expect(error).toMatchObject({ status: 503, busy: true });

    let calls = 0;
    const badKey = createGeminiClient("k", "a", (async () => {
      calls += 1;
      return new Response("bad key", { status: 403 });
    }) as typeof fetch, { models: ["a", "b"], delays: [0] });
    await expect(badKey.structured({ system: "s", prompt: "p", schema: z.object({}) })).rejects.toMatchObject({ status: 403 });
    expect(calls).toBe(1);
  });
});
