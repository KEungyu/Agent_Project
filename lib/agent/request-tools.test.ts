import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { getBoard, listEvents } from "../board/store";
import { openDb } from "../db/client";
import { checkConditions } from "../requests/conditions";
import { loadRequestTypes } from "../request-types/loader";
import type { LlmClient } from "./llm";
import { runAgent } from "./loop";
import { createTools } from "./registry";

const lateCheckin = loadRequestTypes().types.find((type) => type.id === "late_checkin")!;

function setup({ withoutArrival = false } = {}) {
  const db = openDb(":memory:");
  const seeded = seedDemoBoard(db);
  if (withoutArrival) {
    // 도착 예정 시각만 비운다
    db.$client.prepare("UPDATE stays SET expected_arrival = NULL WHERE id = ?").run(seeded.stays[0].id);
  }
  return { db, boardId: seeded.id, stayId: seeded.stays[0].id };
}

const toolUse = (id: string, name: string, input: object) => ({ type: "tool_use", id, name, input });
const reply = (content: object[], stop_reason: string) =>
  ({ content, stop_reason }) as unknown as Anthropic.Beta.BetaMessage;
const scripted = (...responses: Anthropic.Beta.BetaMessage[]): LlmClient => ({
  create: vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("no more scripted responses");
    return next;
  }),
});

describe("check_conditions / ask_user", () => {
  it("보드에 예약번호가 있으면 질문 목록에 예약번호가 없다", () => {
    const { db, boardId } = setup();
    const check = checkConditions(lateCheckin, getBoard(db, boardId)!);
    expect(check.filled.booking_ref).toBe("BK123456");
    expect(check.missing).toEqual([]);
  });

  it("도착 예정 시각만 비어 있으면 그 항목 하나만 묻고, 루프는 이용자 답을 기다린다", async () => {
    const { db, boardId } = setup({ withoutArrival: true });
    const check = checkConditions(lateCheckin, getBoard(db, boardId)!);
    expect(check.missing.map((slot) => slot.key)).toEqual(["expected_arrival"]);

    const llm = scripted(
      reply([toolUse("t1", "check_conditions", { type_id: "late_checkin" })], "tool_use"),
      reply([toolUse("t2", "ask_user", { type_id: "late_checkin", keys: ["expected_arrival"] })], "tool_use"),
    );
    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId },
      messages: [{ role: "user", content: "Tell my hotel I arrive late" }],
      log: () => {},
    });
    expect(result.stopReason).toBe("awaiting_user");
    expect(result.reply).toContain("What time do you expect to arrive at the hotel?");
    expect(llm.create).toHaveBeenCalledTimes(2);
  });

  it("답을 보드에 저장한 뒤 다시 확인하면 질문 없이 넘어가고 re_ask는 0건이다", async () => {
    const { db, boardId, stayId } = setup({ withoutArrival: true });
    const llm = scripted(
      reply(
        [
          toolUse("t1", "board_update", {
            source: "user",
            stay_id: stayId,
            stay: { expected_arrival: "2026-10-20T01:30+09:00" },
          }),
        ],
        "tool_use",
      ),
      reply([toolUse("t2", "check_conditions", { type_id: "late_checkin" })], "tool_use"),
      reply([{ type: "text", text: "Thanks, I have everything I need." }], "end_turn"),
    );
    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId },
      messages: [{ role: "user", content: "Around 1:30 AM" }],
      log: () => {},
    });

    expect(result.stopReason).toBe("end_turn");
    const checkCall = result.toolCalls.find((call) => call.name === "check_conditions")!;
    expect(checkCall.output).toMatchObject({ missing: [] });
    expect(getBoard(db, boardId)!.stays[0].field_sources.expected_arrival).toBe("user");
    expect(listEvents(db, boardId).filter((event) => event.kind === "re_ask")).toHaveLength(0);
  });

  it("보드에 이미 있는 값을 물으려 하면 거부하고 re_ask로 기록한다", async () => {
    const { db, boardId } = setup();
    const llm = scripted(
      reply([toolUse("t1", "ask_user", { type_id: "late_checkin", keys: ["booking_ref"] })], "tool_use"),
      reply([{ type: "text", text: "Your booking number is already saved." }], "end_turn"),
    );
    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId },
      messages: [{ role: "user", content: "go" }],
      log: () => {},
    });

    expect(result.toolCalls[0]).toMatchObject({ name: "ask_user", ok: false });
    expect(JSON.stringify(result.toolCalls[0].output)).toContain("booking_ref=BK123456");
    expect(result.stopReason).toBe("end_turn");
    expect(listEvents(db, boardId).filter((event) => event.kind === "re_ask")).toHaveLength(1);
  });

  it("board_update는 형식이 틀린 시각을 거부한다", async () => {
    const { db, boardId, stayId } = setup();
    const llm = scripted(
      reply([toolUse("t1", "board_update", { source: "user", stay_id: stayId, stay: { expected_arrival: "1:30 AM" } })], "tool_use"),
      reply([{ type: "text", text: "ok" }], "end_turn"),
    );
    const result = await runAgent({ llm, tools: createTools(), ctx: { db, boardId }, messages: [{ role: "user", content: "go" }], log: () => {} });
    expect(result.toolCalls[0].ok).toBe(false);
    expect(getBoard(db, boardId)!.stays[0].expected_arrival).toBe("2026-10-20T01:30+09:00");
  });
});
