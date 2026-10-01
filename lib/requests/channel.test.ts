import { describe, expect, it } from "vitest";
import { runAgent } from "../agent/loop";
import { createTools } from "../agent/registry";
import { fakeLlm, message, toolUse } from "../agent/testing";
import { seedDemoBoard } from "../board/demo";
import { getBoard } from "../board/store";
import type { Stay } from "../board/types";
import { openDb } from "../db/client";
import { loadRequestTypes } from "../request-types/loader";
import { decideChannel, formatPhoneScript } from "./channel";

const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;
const ARRIVAL = "2026-10-20T01:30+09:00";
const slots = { expected_arrival: ARRIVAL };
const stay = { email: "front@hotel-example.test", phone: "+82-2-000-0000" } as Stay;
const hoursBefore = (h: number) => new Date(new Date(ARRIVAL).getTime() - h * 3_600_000);

describe("decideChannel", () => {
  it("도착 30시간 전이면 메일, 3시간 전이면 전화", () => {
    expect(decideChannel(type, stay, slots, hoursBefore(30))).toEqual({ channel: "email", reason: "email_default", hours_left: 30 });
    expect(decideChannel(type, stay, slots, hoursBefore(3))).toEqual({ channel: "phone", reason: "deadline_soon", hours_left: 3 });
  });

  it("숙소 이메일이 없고 전화번호만 있으면 시간과 관계없이 전화", () => {
    const phoneOnly = { phone: "+82-2-000-0000" } as Stay;
    expect(decideChannel(type, phoneOnly, slots, hoursBefore(48)).channel).toBe("phone");
    expect(decideChannel(type, phoneOnly, slots, hoursBefore(48)).reason).toBe("no_email");
  });

  it("급해도 전화번호가 없으면 메일, 연락처가 없으면 판단하지 않는다", () => {
    expect(decideChannel(type, { email: "a@b.test" } as Stay, slots, hoursBefore(2)).reason).toBe("no_phone_but_urgent");
    expect(decideChannel(type, {} as Stay, slots, hoursBefore(30)).channel).toBeNull();
  });
});

describe("draft_request의 전화 경로", () => {
  const script = {
    lines: [{ ko: "안녕하세요. 예약자명 Emma Smith입니다.", pronunciation: "annyeonghaseyo. yeyakjamyeong Emma Smith-imnida.", meaning: "Hello, the booking is under Emma Smith." }],
    expected_replies: [{ ko: "네, 가능합니다.", meaning: "Yes, that's possible." }],
  };

  it("도착 3시간 전이면 메일 초안 대신 전화 스크립트를 주고, 발송 단계로 가지 않는다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const llm = fakeLlm([message([toolUse("t1", "draft_request", { type_id: "late_checkin" })], "tool_use")], () => script);

    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId: board.id, now: () => hoursBefore(3) },
      messages: [{ role: "user", content: "I land soon, tell my hotel" }],
      log: () => {},
    });

    expect(result.stopReason).toBe("awaiting_user");
    expect(result.reply).toContain("only 3 hours away");
    expect(result.reply).toContain("annyeonghaseyo");
    expect(result.reply).toContain(formatPhoneScript(script));
    const [request] = getBoard(db, board.id)!.requests;
    expect(request).toMatchObject({ channel: "phone", status: "draft" });
    expect(request.draft).toBeUndefined();
  });

  it("연락처가 하나도 없으면 요청을 만들지 않고 연락처를 물으라고 알린다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    db.$client.prepare("UPDATE stays SET email = NULL, phone = NULL").run();
    const llm = fakeLlm([
      message([toolUse("t1", "draft_request", { type_id: "late_checkin" })], "tool_use"),
      message([{ type: "text", text: "What is the hotel's email or phone?" }], "end_turn"),
    ]);

    const result = await runAgent({ llm, tools: createTools(), ctx: { db, boardId: board.id }, messages: [{ role: "user", content: "go" }], log: () => {} });

    expect(JSON.stringify(result.toolCalls[0].output)).toContain("No email or phone");
    expect(getBoard(db, board.id)!.requests).toEqual([]);
  });
});
