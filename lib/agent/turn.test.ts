import { describe, expect, it, vi } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { openDb } from "../db/client";
import { getConversation } from "./conversation";
import { fakeLlm, message, toolUse } from "./testing";
import { runTurn } from "./turn";
import { getMessages } from "../i18n/messages";

describe("runTurn", () => {
  it("passes one 45s deadline to the client and turns an interrupted connection into a retryable answer", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    let received: AbortSignal | undefined;
    try {
      const result = await runTurn({ db, boardId: board.id, language: "en", text: "Tell my hotel I arrive at 1:30 AM.", createLlm: (signal) => {
        received = signal;
        return fakeLlm([() => { throw new TypeError("fetch failed"); }]);
      } });
      expect(timeout).toHaveBeenCalledWith(45_000);
      expect(received).toBeInstanceOf(AbortSignal);
      expect(result).toEqual({ ok: false, error: getMessages("en").chat.unavailable });
    } finally {
      timeout.mockRestore();
      db.$client.close();
    }
  });
  it("keeps a reply that came from a tool or a stop in the conversation, so it survives a re-render", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    // 없는 도구를 두 번 부르면 루프가 tool_error로 멈추고, 마지막 메시지는 tool_result(user)다
    const llm = fakeLlm([
      () => message([toolUse("a", "no_such_tool", {})], "tool_use"),
      () => message([toolUse("b", "no_such_tool", {})], "tool_use"),
    ]);
    const result = await runTurn({ db, boardId: board.id, language: "en", text: "hello", createLlm: () => llm });
    expect(result.ok && "reply" in result && result.reply).toBeTruthy();
    const last = getConversation(board.id).at(-1)!;
    expect(last.role).toBe("assistant");
    expect(JSON.stringify(last.content)).toContain((result as { reply: string }).reply.slice(0, 20));
  });
});
