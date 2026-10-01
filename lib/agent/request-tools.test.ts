import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { getBoard, listEvents } from "../board/store";
import { openDb } from "../db/client";
import { checkConditions } from "../requests/conditions";
import { loadRequestTypes } from "../request-types/loader";
import { runAgent } from "./loop";
import { createTools } from "./registry";
import { fakeLlm, message, schemaHas, toolUse } from "./testing";

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

const reply = message;
const scripted = (...turns: Anthropic.Beta.BetaMessage[]) => fakeLlm(turns);

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

  it("draft_request는 초안·역번역을 만들고 요청을 승인 대기로 둔 채 멈춘다 (발송하지 않음)", async () => {
    const { db, boardId } = setup();
    const draftOutput = (slots: Record<string, string>) => {
      const body = `예약자명 ${slots.guest_name}, 예약번호 ${slots.booking_ref}. 체크인 날짜 10월 19일, 도착 예정 시각 새벽 1시 30분. 늦은 체크인 가능 여부 문의. 프런트 마감 후 출입 방법 문의.`;
      const items = lateCheckin.message_guidelines.must_include;
      return { subject_ko: "늦은 체크인 문의", body_ko: body, coverage: items.map((item) => ({ item, quote: item })) };
    };
    const llm = fakeLlm(
      [message([toolUse("t1", "draft_request", { type_id: "late_checkin" })], "tool_use")],
      (request) =>
        schemaHas(request, "coverage")
          ? draftOutput(JSON.parse(request.prompt.replace("Facts (JSON): ", "")))
          : { subject: "Late check-in inquiry", body: "Guest Emma Smith ..." },
    );

    const result = await runAgent({ llm, tools: createTools(), ctx: { db, boardId }, messages: [{ role: "user", content: "go" }], log: () => {} });

    expect(result.stopReason).toBe("awaiting_user");
    expect(result.reply).toContain("Nothing has been sent yet");
    const [request] = getBoard(db, boardId)!.requests;
    expect(request).toMatchObject({ type_id: "late_checkin", status: "pending_approval" });
    expect(request.draft?.back_translation).toContain("Late check-in inquiry");
    expect(request.draft?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(request.sent).toBeUndefined();
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
