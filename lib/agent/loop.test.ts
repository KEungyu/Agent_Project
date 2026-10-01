import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { seedDemoBoard } from "../board/demo";
import { listEvents } from "../board/store";
import { openDb } from "../db/client";
import { createClaudeClient, MissingApiKeyError, type LlmRequest } from "./llm";
import { runAgent } from "./loop";
import { fakeLlm, message, text, toolUse } from "./testing";
import { boardGet, defineTool } from "./tools";

const scriptedLlm = (...turns: ((req: LlmRequest) => Anthropic.Beta.BetaMessage)[]) => fakeLlm(turns);

function setup() {
  const db = openDb(":memory:");
  const board = seedDemoBoard(db);
  return { db, ctx: { db, boardId: board.id } };
}

const failing = defineTool({
  name: "always_fails",
  description: "test tool that always throws",
  input: z.object({}),
  run: () => {
    throw new Error("boom");
  },
});

const silent = () => {};

describe("runAgent", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("board_get을 호출하고 그 결과로 숙소명을 답한다", async () => {
    const { db, ctx } = setup();
    const llm = scriptedLlm(
      () => message([toolUse("t1", "board_get", { field: "stays" })], "tool_use"),
      (req) => {
        const lastTurn = req.messages.at(-1)!.content as Anthropic.Beta.BetaToolResultBlockParam[];
        const stays = JSON.parse(lastTurn[0].content as string).stays;
        return message([text(`Your hotel is ${stays[0].name}.`)], "end_turn");
      },
    );

    const result = await runAgent({ llm, tools: [boardGet], ctx, messages: [{ role: "user", content: "What's my hotel name?" }], log: silent });

    expect(result.stopReason).toBe("end_turn");
    expect(result.toolCalls.map((call) => call.name)).toEqual(["board_get"]);
    expect(result.reply).toBe("Your hotel is Hotel Example Myeongdong.");
    expect(listEvents(db, ctx.boardId).filter((event) => event.kind === "tool_call")).toHaveLength(1);
  });

  it("같은 도구가 2회 연속 실패하면 tool_error로 멈춘다", async () => {
    const { ctx } = setup();
    const llm = scriptedLlm(
      () => message([toolUse("t1", "always_fails", {})], "tool_use"),
      () => message([toolUse("t2", "always_fails", {})], "tool_use"),
    );
    const result = await runAgent({ llm, tools: [failing], ctx, messages: [{ role: "user", content: "go" }], log: silent });

    expect(result.stopReason).toBe("tool_error");
    expect(result.toolCalls.map((call) => call.ok)).toEqual([false, false]);
    expect(llm.create).toHaveBeenCalledTimes(2);
    // 마지막 턴은 tool_result여야 대화를 이어갈 수 있다
    expect(result.messages.at(-1)!.role).toBe("user");
  });

  it("같은 도구를 같은 입력으로 연속 호출하면 repeated_call로 멈춘다", async () => {
    const { ctx } = setup();
    const llm = scriptedLlm(
      () => message([toolUse("t1", "board_get", {})], "tool_use"),
      () => message([toolUse("t2", "board_get", {})], "tool_use"),
    );
    const result = await runAgent({ llm, tools: [boardGet], ctx, messages: [{ role: "user", content: "go" }], log: silent });

    expect(result.stopReason).toBe("repeated_call");
    expect(result.toolCalls).toHaveLength(1);
  });

  it("도구 호출이 8회를 넘으면 max_tool_calls로 멈춘다", async () => {
    const { ctx } = setup();
    const fields = ["arrival", "departure", "stays", "itinerary", "requests"];
    const llm = scriptedLlm(
      ...Array.from({ length: 9 }, (_, i) => () =>
        message([toolUse(`t${i}`, "board_get", { field: fields[i % fields.length] })], "tool_use"),
      ),
    );
    const result = await runAgent({ llm, tools: [boardGet], ctx, messages: [{ role: "user", content: "go" }], log: silent });

    expect(result.stopReason).toBe("max_tool_calls");
    expect(result.toolCalls).toHaveLength(8);
  });

  it("모르는 도구나 잘못된 입력은 오류 결과로 돌려준다", async () => {
    const { ctx } = setup();
    const llm = scriptedLlm(
      () => message([toolUse("t1", "board_get", { field: "passport" })], "tool_use"),
      () => message([text("ok")], "end_turn"),
    );
    const result = await runAgent({ llm, tools: [boardGet], ctx, messages: [{ role: "user", content: "go" }], log: silent });

    expect(result.toolCalls[0].ok).toBe(false);
    expect(result.stopReason).toBe("end_turn");
  });

  it("API 키가 없으면 키 이름만 알려주는 오류를 낸다", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => createClaudeClient()).toThrow(MissingApiKeyError);
    expect(() => createClaudeClient()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
