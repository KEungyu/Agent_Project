import type Anthropic from "@anthropic-ai/sdk";
import { recordEvent } from "../board/store";
import type { LlmClient } from "./llm";
import { SYSTEM_PROMPT } from "./prompt";
import { toApiTool, type AgentTool, type ToolContext } from "./tools";

// ARCHITECTURE §2-3 종료 조건. 반복 감지는 직전에 성공한 호출과 같은 호출을 다시 할 때 멈춘다
// (실패한 호출의 재시도는 maxConsecutiveErrors가 맡는다).
export const LOOP_LIMITS = { maxToolCalls: 8, maxConsecutiveErrors: 2 };

export type StopReason =
  | "end_turn"
  | "awaiting_user" // 질문·승인 등 이용자 답을 기다리며 일시 정지
  | "max_tool_calls"
  | "repeated_call"
  | "tool_error"
  | "refusal"
  | "max_tokens";

const STOP_MESSAGES: Record<Exclude<StopReason, "end_turn" | "awaiting_user">, string> = {
  max_tool_calls: "I had to stop: this took more steps than allowed. Could you tell me more specifically what you need?",
  repeated_call: "I had to stop: I was repeating the same step without progress. Could you rephrase your request?",
  tool_error: "I had to stop: one of my tools kept failing. Please try again in a moment.",
  refusal: "Sorry, I can't help with that request.",
  max_tokens: "Sorry, my answer was cut off. Please try again.",
};

export type ToolCallLog = { name: string; input: unknown; ok: boolean; output: unknown };

export type AgentRunResult = {
  reply: string;
  stopReason: StopReason;
  toolCalls: ToolCallLog[];
  messages: Anthropic.Beta.BetaMessageParam[];
};

type RunOptions = {
  llm: LlmClient;
  tools: AgentTool[];
  ctx: Omit<ToolContext, "llm">;
  messages: Anthropic.Beta.BetaMessageParam[];
  system?: string;
  log?: (line: string) => void;
};

export async function runAgent({
  llm,
  tools,
  ctx,
  messages,
  system = SYSTEM_PROMPT,
  log = console.log,
}: RunOptions): Promise<AgentRunResult> {
  const history = [...messages];
  const apiTools = tools.map(toApiTool);
  const toolCalls: ToolCallLog[] = [];
  const errorStreak = new Map<string, number>();
  let lastOkCallKey: string | undefined;

  const finish = (stopReason: StopReason, reply: string): AgentRunResult => {
    log(`[agent] stop: ${stopReason}`);
    return { reply, stopReason, toolCalls, messages: history };
  };

  while (true) {
    const response = await llm.create({ system, tools: apiTools, messages: history });
    // 응답 내용(thinking 블록 포함)은 그대로 이어 붙인다
    history.push({ role: "assistant", content: response.content });
    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (response.stop_reason === "refusal") return finish("refusal", text || STOP_MESSAGES.refusal);

    const uses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use",
    );
    if (uses.length === 0) {
      if (response.stop_reason === "max_tokens") return finish("max_tokens", text || STOP_MESSAGES.max_tokens);
      return finish("end_turn", text);
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    let userPrompt = "";
    // 잘린 입력으로 도구를 실행하지 않는다
    let stop: StopReason | undefined = response.stop_reason === "max_tokens" ? "max_tokens" : undefined;

    for (const use of uses) {
      const key = `${use.name}:${JSON.stringify(use.input)}`;
      if (!stop && toolCalls.length >= LOOP_LIMITS.maxToolCalls) stop = "max_tool_calls";
      if (!stop && key === lastOkCallKey) stop = "repeated_call";
      if (stop) {
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Not run: ${stop}` });
        continue;
      }

      const call = await executeTool(tools, use, { ...ctx, llm });
      toolCalls.push(call);
      lastOkCallKey = call.ok ? key : undefined;
      recordEvent(ctx.db, ctx.boardId, "tool_call", { tool: use.name, ok: call.ok });
      log(`[agent] tool ${use.name} ${JSON.stringify(use.input)} → ${call.ok ? "ok" : "error"}`);
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        is_error: !call.ok,
        content: JSON.stringify(call.output),
      });

      const streak = call.ok ? 0 : (errorStreak.get(use.name) ?? 0) + 1;
      errorStreak.set(use.name, streak);
      if (streak >= LOOP_LIMITS.maxConsecutiveErrors) stop = "tool_error";

      if (call.ok && tools.find((tool) => tool.name === use.name)?.endsTurn) {
        stop = "awaiting_user";
        userPrompt = (call.output as { reply: string }).reply;
      }
    }

    // tool_use 뒤에는 항상 tool_result를 붙여 대화를 이어갈 수 있게 둔다
    history.push({ role: "user", content: results });
    if (stop === "awaiting_user") return finish(stop, [text, userPrompt].filter(Boolean).join("\n\n"));
    if (stop) return finish(stop, STOP_MESSAGES[stop]);
  }
}

async function executeTool(
  tools: AgentTool[],
  use: Anthropic.Beta.BetaToolUseBlock,
  ctx: ToolContext,
): Promise<ToolCallLog> {
  const tool = tools.find((candidate) => candidate.name === use.name);
  if (!tool) return { name: use.name, input: use.input, ok: false, output: { error: `unknown tool: ${use.name}` } };

  const parsed = tool.input.safeParse(use.input);
  if (!parsed.success) {
    return { name: use.name, input: use.input, ok: false, output: { error: "invalid input", issues: parsed.error.issues } };
  }
  try {
    return { name: use.name, input: use.input, ok: true, output: await tool.run(parsed.data, ctx) };
  } catch (error) {
    return { name: use.name, input: use.input, ok: false, output: { error: (error as Error).message } };
  }
}
