import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { openDb } from "../db/client";
import { getConversation } from "./conversation";
import { fakeLlm, message, toolUse } from "./testing";
import { runTurn } from "./turn";

describe("runTurn", () => {
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
