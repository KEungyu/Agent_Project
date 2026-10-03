import { describe, expect, it } from "vitest";
import { fakeLlm, schemaHas } from "../agent/testing";
import { loadRequestTypes } from "../request-types/loader";
import { checkDraft, composeDraft, containsCardNumber, draftFacts, hashDraft, koreanDateTime, sanitizeSlots } from "./drafting";

const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;
const SLOTS = { guest_name: "Emma Smith", booking_ref: "BK123456", expected_arrival: "2026-10-20T01:30+09:00" };

const BODY =
  "안녕하세요. 예약자 Emma Smith, 예약번호 BK123456입니다. 체크인 날짜는 2026년 10월 19일이며 2026년 10월 20일 01:30(KST)에 도착할 예정입니다. " +
  "늦은 체크인이 가능한지 여쭙니다. 프런트가 닫힌 뒤에는 어떻게 들어가면 되는지 알려 주세요. 이 메일로 답장 부탁드립니다.";

const GOOD = {
  subject_ko: "늦은 체크인 문의 (BK123456)",
  body_ko: BODY,
  coverage: [
    { item: "예약자명", quote: "예약자 Emma Smith" },
    { item: "예약번호", quote: "예약번호 BK123456" },
    { item: "체크인 날짜", quote: "체크인 날짜는 2026년 10월 19일" },
    { item: "도착 예정 시각", quote: "2026년 10월 20일 01:30(KST)에 도착할 예정" },
    { item: "늦은 체크인 가능 여부", quote: "늦은 체크인이 가능한지" },
    { item: "프런트 마감 후 출입 방법", quote: "프런트가 닫힌 뒤에는 어떻게 들어가면 되는지" },
  ],
};

describe("checkDraft", () => {
  it("필수 항목이 모두 본문에 있으면 통과한다", () => {
    expect(checkDraft(type, SLOTS, GOOD)).toEqual([]);
  });

  it("빠진 항목, 본문에 없는 인용, 바뀐 예약번호, 카드번호, 길이 초과를 잡는다", () => {
    const bad = {
      ...GOOD,
      body_ko: BODY.replace("BK123456", "BK-123456") + " 카드 4111 1111 1111 1111" + "가".repeat(600),
      coverage: GOOD.coverage.filter((entry) => entry.item !== "도착 예정 시각").map((entry) =>
        entry.item === "늦은 체크인 가능 여부" ? { ...entry, quote: "지어낸 문장" } : entry,
      ),
    };
    const problems = checkDraft(type, SLOTS, bad).join("\n");
    expect(problems).toContain("필수 항목 누락: 도착 예정 시각");
    expect(problems).toContain("늦은 체크인 가능 여부");
    expect(problems).toContain('booking_ref 값 "BK123456"');
    expect(problems).toContain("카드번호");
    expect(problems).toContain("600자를 넘는다");
  });
});

describe("card numbers", () => {
  it("Luhn을 통과하는 카드번호만 지우고 날짜·전화번호는 남긴다", () => {
    expect(sanitizeSlots({ note: "card 4111 1111 1111 1111" }).note).toBe("card [removed]");
    expect(containsCardNumber("2026-10-19 2026-10-22")).toBe(false);
    expect(containsCardNumber("+82-2-000-0000")).toBe(false);
  });
});

describe("composeDraft", () => {
  it("검사에 걸리면 문제를 알려 주고 다시 쓰게 하며, 역번역에는 한국어 원문만 보낸다", async () => {
    const first = { ...GOOD, coverage: GOOD.coverage.slice(1) };
    const prompts: string[] = [];
    let draftCalls = 0;
    const llm = fakeLlm([], (request) => {
      prompts.push(request.prompt);
      if (schemaHas(request, "coverage")) return draftCalls++ === 0 ? first : GOOD;
      return { subject: "Late check-in inquiry (BK123456)", body: "Hello. This is Emma Smith ..." };
    });

    const { draft, checks } = await composeDraft(llm, type, { ...SLOTS, guest_name: "Emma Smith" }, "en");

    expect(draftCalls).toBe(2);
    expect(prompts[1]).toContain("필수 항목 누락: 예약자명");
    expect(prompts[2]).toBe(`Subject: ${GOOD.subject_ko}\n\n${GOOD.body_ko}`);
    expect(draft.back_translation).toContain("Late check-in inquiry");
    expect(draft.hash).toBe(hashDraft(GOOD.subject_ko, GOOD.body_ko));
    expect(checks).toHaveLength(type.message_guidelines.must_include.length);
  });

  it("카드번호가 섞인 값은 LLM에 보내기 전에 지운다", async () => {
    const seen: string[] = [];
    const llm = fakeLlm([], (request) => {
      seen.push(request.prompt);
      if (schemaHas(request, "coverage")) return GOOD;
      return { subject: "s", body: "b" };
    });
    await composeDraft(llm, type, { ...SLOTS, special_request: "pay with 4111111111111111" }, "en");
    expect(seen[0]).not.toContain("4111111111111111");
    expect(seen[0]).toContain("[removed]");
  });
});

describe("날짜·시각 표기", () => {
  it("ISO 값을 연도·요일·24시간·KST가 있는 한국어 표기로 바꾼다", () => {
    expect(koreanDateTime("2026-10-10T01:00+09:00")).toBe("2026년 10월 10일(토) 01:00(KST)");
    expect(koreanDateTime("2026-10-09")).toBe("2026년 10월 9일(금)");
    expect(koreanDateTime("Review Test Hotel")).toBeUndefined();
  });

  it("도착 시각에 연도나 KST가 빠지거나 날짜에 연도가 없으면 다시 쓰게 한다", () => {
    const facts = draftFacts({ ...SLOTS, check_in_date: "2026-10-19" });
    expect(checkDraft(type, facts, GOOD)).toEqual([]);
    const noYear = { ...GOOD, body_ko: GOOD.body_ko.replace("2026년 10월 20일 01:30(KST)", "10월 20일 새벽 1시 30분").replace("2026년 10월 19일", "10월 19일") };
    const problems = checkDraft(type, facts, noYear);
    expect(problems.some((problem) => problem.includes("expected_arrival"))).toBe(true);
    expect(problems.some((problem) => problem.includes("check_in_date"))).toBe(true);
  });
});
