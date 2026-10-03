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
import { needsDateConfirmation } from "./tools";

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
      const body = `예약자명 ${slots.guest_name}, 예약번호 ${slots.booking_ref}. 체크인 날짜 ${slots.check_in_date_ko}, 도착 예정 시각 ${slots.expected_arrival_ko}. 늦은 체크인 가능 여부 문의. 프런트 마감 후 출입 방법 문의.`;
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
    expect(result.reply).toContain("Nothing's been sent yet");
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

describe("채팅으로 초안 고치기", () => {
  it("승인 대기 초안이 있을 때 revision_note와 함께 다시 부르면 같은 요청의 초안을 바꾼다", async () => {
    const { db, boardId } = setup();
    const draftOutput = (slots: Record<string, string>, note = "") => {
      const body = `예약자명 ${slots.guest_name}, 예약번호 ${slots.booking_ref}. 체크인 날짜 ${slots.check_in_date_ko}, 도착 예정 시각 ${slots.expected_arrival_ko}, 늦은 체크인 가능 여부, 프런트 마감 후 출입 방법 문의.${note}`;
      return { subject_ko: "늦은 체크인 문의", body_ko: body, coverage: lateCheckin.message_guidelines.must_include.map((item) => ({ item, quote: item })) };
    };
    const structured = (request: Parameters<typeof schemaHas>[0]) =>
      schemaHas(request, "coverage")
        ? draftOutput(JSON.parse(request.prompt.split("\n")[0].replace("Facts (JSON): ", "")), request.prompt.includes("changes") ? " 정중하게." : "")
        : { subject: "Late check-in inquiry", body: "..." };
    const run = (input: object) =>
      runAgent({
        llm: fakeLlm([message([toolUse("t1", "draft_request", input)], "tool_use")], structured),
        tools: createTools(),
        ctx: { db, boardId },
        messages: [{ role: "user", content: "go" }],
        log: () => {},
      });

    await run({ type_id: "late_checkin" });
    const [first] = getBoard(db, boardId)!.requests;
    const again = await run({ type_id: "late_checkin", revision_note: "more polite" });

    expect(again.toolCalls[0].ok).toBe(true);
    const requests = getBoard(db, boardId)!.requests;
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ id: first.id, status: "pending_approval" });
    expect(requests[0].draft?.body_ko).toContain("정중하게");
    expect(requests[0].draft?.hash).not.toBe(first.draft?.hash);
  });
});

describe("초안 고치기 실패", () => {
  it("다시 쓰기에 실패하면 승인 대기 중인 기존 초안을 그대로 둔다", async () => {
    const { db, boardId } = setup();
    const good = (request: Parameters<typeof schemaHas>[0]) => {
      if (!schemaHas(request, "coverage")) return { subject: "Late check-in inquiry", body: "..." };
      const slots = JSON.parse(request.prompt.split("\n")[0].replace("Facts (JSON): ", ""));
      const body = `예약자명 ${slots.guest_name}, 예약번호 ${slots.booking_ref}. 체크인 날짜 ${slots.check_in_date_ko}, 도착 예정 시각 ${slots.expected_arrival_ko}, 늦은 체크인 가능 여부, 프런트 마감 후 출입 방법 문의.`;
      return { subject_ko: "늦은 체크인 문의", body_ko: body, coverage: lateCheckin.message_guidelines.must_include.map((item) => ({ item, quote: item })) };
    };
    const run = (input: object, structured: (request: Parameters<typeof schemaHas>[0]) => unknown) =>
      runAgent({
        llm: fakeLlm([message([toolUse("t1", "draft_request", input)], "tool_use"), message([{ type: "text", text: "sorry" }], "end_turn")], structured),
        tools: createTools(),
        ctx: { db, boardId },
        messages: [{ role: "user", content: "go" }],
        log: () => {},
      });

    await run({ type_id: "late_checkin" }, good);
    const [before] = getBoard(db, boardId)!.requests;
    const failed = await run({ type_id: "late_checkin", revision_note: "arrive at 02:00" }, () => {
      throw new Error("model unavailable");
    });

    expect(failed.toolCalls[0].ok).toBe(false);
    const requests = getBoard(db, boardId)!.requests;
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ id: before.id, status: "pending_approval" });
    expect(requests[0].draft?.hash).toBe(before.draft?.hash);
  });
});

describe("board_update 입력 검사", () => {
  it("숙소 밖에 둔 도착 시각처럼 모르는 키는 저장된 척하지 않고 거부한다", async () => {
    const { db, boardId, stayId } = setup();
    const llm = scripted(
      reply([toolUse("t1", "board_update", { source: "user", stay_id: stayId, expected_arrival: "2026-10-20T02:00+09:00" })], "tool_use"),
      reply([{ type: "text", text: "ok" }], "end_turn"),
    );
    const result = await runAgent({ llm, tools: createTools(), ctx: { db, boardId }, messages: [{ role: "user", content: "go" }], log: () => {} });
    expect(result.toolCalls[0].ok).toBe(false);
    expect(getBoard(db, boardId)!.stays[0].expected_arrival).toBe("2026-10-20T01:30+09:00");
  });
});

describe("오늘에 묶은 지난 시각", () => {
  const now = new Date("2026-10-09T21:00:00+09:00");
  it("'오늘 새벽 2시'를 다음 날로 옮기려 하면 확인할 날짜를 돌려준다", () => {
    expect(needsDateConfirmation("2026-10-10T02:00+09:00", "오늘 새벽 2시에 도착할 것 같아", now)).toBe("2026-10-10 02:00 KST");
  });
  it("'오늘 밤', 날짜 말이 없는 경우, 오늘 아직 안 지난 시각은 그대로 진행한다", () => {
    expect(needsDateConfirmation("2026-10-10T02:00+09:00", "오늘 밤 새벽 2시에 도착해", now)).toBeUndefined();
    expect(needsDateConfirmation("2026-10-10T02:00+09:00", "새벽 2시에 도착해", now)).toBeUndefined();
    expect(needsDateConfirmation("2026-10-09T23:00+09:00", "오늘 밤 11시 도착", now)).toBeUndefined();
    expect(needsDateConfirmation("2026-10-09T23:00+09:00", "오늘 11시 도착", now)).toBeUndefined();
  });
  it("확인을 받은 다음 턴(오늘이라는 말 없음)에는 저장한다", () => {
    expect(needsDateConfirmation("2026-10-10T02:00+09:00", "응, 10일 새벽 2시 맞아", now)).toBeUndefined();
  });
});

describe("board_update — 오늘에 묶은 지난 시각", () => {
  it("저장하지 않고 확인할 날짜를 돌려준다 (오류로 멈추지 않음)", async () => {
    const { db, boardId, stayId } = setup();
    const llm = scripted(
      reply([toolUse("t1", "board_update", { source: "user", stay_id: stayId, stay: { expected_arrival: "2026-10-10T02:00+09:00" } })], "tool_use"),
      reply([{ type: "text", text: "Do you mean 2026-10-10 02:00 KST?" }], "end_turn"),
    );
    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId, now: () => new Date("2026-10-09T21:00:00+09:00"), latestUserText: "오늘 새벽 2시에 도착해" },
      messages: [{ role: "user", content: "오늘 새벽 2시에 도착해" }],
      log: () => {},
    });
    expect(result.toolCalls[0]).toMatchObject({ ok: true, output: { saved: false, confirm_first: "2026-10-10 02:00 KST" } });
    expect(getBoard(db, boardId)!.stays[0].expected_arrival).toBe("2026-10-20T01:30+09:00");
  });
});
