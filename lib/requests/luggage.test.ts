import { describe, expect, it } from "vitest";
import { runAgent } from "../agent/loop";
import { createTools } from "../agent/registry";
import { fakeLlm, message, schemaHas, toolUse } from "../agent/testing";
import { seedDemoBoard } from "../board/demo";
import { getBoard } from "../board/store";
import { openDb } from "../db/client";
import { createMockMailer } from "../mail/mailer";
import { LUGGAGE_REPLIES } from "../../tests/fixtures/luggage-replies";
import { loadRequestTypes } from "../request-types/loader";
import { approveAndSend } from "./approval";
import { checkConditions } from "./conditions";
import { addReply, applyInterpretation } from "./replies";

// P1-3: 짐 보관은 데이터 파일(data/request-types/luggage_storage.yaml)만 추가해 동작해야 한다
const type = loadRequestTypes().types.find((candidate) => candidate.id === "luggage_storage")!;

describe("짐 보관 요청 유형 (데이터만 추가)", () => {
  it("보드에 있는 값은 묻지 않고 짐 개수와 찾아갈 시각만 묻는다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const check = checkConditions(type, getBoard(db, board.id)!);
    expect(check.missing.map((slot) => slot.key)).toEqual(["pickup_time", "bag_count"]);
    expect(check.filled).toMatchObject({ booking_ref: "BK123456", check_out_date: "2026-10-22" });
  });

  it("초안 → 승인 → 모의 발송 → 회신 해석까지 기존 코드로 동작한다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const provided = { pickup_time: "17:00", bag_count: "2" };
    const llm = fakeLlm(
      [message([toolUse("t1", "draft_request", { type_id: "luggage_storage", provided })], "tool_use")],
      (request) => {
        if (!schemaHas(request, "coverage")) return { subject: "Luggage storage", body: "Can you keep 2 bags until 17:00?" };
        const body = "예약자명 Emma Smith, 예약번호 BK123456. 체크아웃 날짜 10월 22일. 짐 개수 2개. 찾아갈 시각 오후 5시. 보관 가능 여부와 요금 문의.";
        return {
          subject_ko: "체크아웃 후 짐 보관 문의",
          body_ko: body,
          coverage: type.message_guidelines.must_include.map((item) => ({ item, quote: item })),
        };
      },
    );

    const result = await runAgent({
      llm,
      tools: createTools(),
      ctx: { db, boardId: board.id, now: () => new Date("2026-10-20T09:00:00+09:00") },
      messages: [{ role: "user", content: "Can I leave 2 bags after check-out until 5 PM?" }],
      log: () => {},
    });
    expect(result.stopReason).toBe("awaiting_user");

    const [request] = getBoard(db, board.id)!.requests;
    expect(request).toMatchObject({ type_id: "luggage_storage", status: "pending_approval", channel: "email" });
    expect(request.slots).toMatchObject(provided);

    expect(approveAndSend(db, request.id, createMockMailer(`/tmp/majung-luggage-${Date.now()}`)).status).toBe("awaiting_reply");

    const conditional = LUGGAGE_REPLIES.find((reply) => reply.label === "conditional")!;
    const reply = addReply(db, request.id, conditional.raw_ko);
    const after = applyInterpretation(db, reply, {
      class: "conditional",
      conditions: ["Until 6 PM", "3,000 won per bag"],
      requested_info: [],
      summary: "They can keep your bags until 6 PM for 3,000 won each.",
      confidence: 0.9,
      needs_user_check: false,
    });
    expect(after.status).toBe("conditional");
  });
});
