import { describe, expect, it } from "vitest";
import { systemPrompt } from "../agent/prompt";
import { seedDemoBoard } from "../board/demo";
import { getBoard, updateBoard } from "../board/store";
import { openDb } from "../db/client";
import { checkConditions } from "../requests/conditions";
import { loadRequestTypes } from "../request-types/loader";
import { LANGUAGES, getLanguage } from "./languages";
import { fmt, getMessages } from "./messages";

const { types } = loadRequestTypes();

describe("i18n", () => {
  it("모든 요청 유형의 이름과 질문이 9개 언어로 준비되어 있다", () => {
    for (const type of types) {
      for (const { code } of LANGUAGES) {
        expect(type.label[code], `${type.id} label ${code}`).toBeTruthy();
        for (const slot of type.required_slots) expect(slot.ask[code], `${type.id}.${slot.key} ${code}`).toBeTruthy();
      }
    }
  });

  it("보드 언어에 맞는 질문을 돌려준다", () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    db.$client.prepare("UPDATE stays SET booking_ref = NULL").run();
    updateBoard(db, board.id, { user_language: "ja" });
    const check = checkConditions(types[0], getBoard(db, board.id)!);
    expect(check.missing).toEqual([{ key: "booking_ref", question: "予約番号を教えてください。" }]);
  });

  it("시스템 프롬프트가 이용자 언어로 답하라고 지시하고, 모르는 코드는 영어로 대체한다", () => {
    expect(systemPrompt("th")).toContain("Always reply to the traveler in Thai");
    expect(getLanguage("xx").code).toBe("en");
    expect(getMessages("xx").language).toBe("Language");
  });

  it("자리표시자를 채운다", () => {
    expect(fmt(getMessages("ko").sent.sentTo, { to: "a@b.test", time: "10월 20일" })).toBe("a@b.test에 보냄 · 10월 20일");
  });
});
