import { describe, expect, it } from "vitest";
import { fakeLlm } from "../agent/testing";
import { runTurn } from "../agent/turn";
import { seedDemoBoard } from "../board/demo";
import { listEvents } from "../board/store";
import { openDb } from "../db/client";
import { checkSafety } from "./guard";

const EMERGENCIES = [
  "I was in a car accident and I'm hurt",
  "Help me, my friend is bleeding",
  "사고가 났어요 구급차 불러 주세요",
  "友達が怪我をしました、救急車を",
  "我朋友受伤了，请叫救护车",
  "我的錢包被搶劫了，要報警",
  "Tôi bị tai nạn, cần cấp cứu",
  "มีอุบัติเหตุ ต้องการรถพยาบาล",
  "Ada kebakaran di hotel!",
  "Me robaron el pasaporte, es una emergencia",
];
const ADMIN = [
  "How do I apply for an alien registration card?",
  "Can I extend my visa while I'm here?",
  "외국인등록증은 어디서 만들어요?",
  "ビザの延長はできますか？",
  "我想办签证延期",
  "Làm sao gia hạn thị thực?",
];
const NORMAL = [
  "Tell my hotel I arrive at 1:30 AM.",
  "What is on my trip board?",
  "Is my hotel near the police station?",
  "Are there fireworks at Busan this weekend?",
  "Can I pay with Visa at the hotel?",
  "How do I get from Incheon to Myeongdong?",
  "Please ask if I can leave my bags after check-out.",
  "호텔에 새벽 1시 30분에 도착한다고 알려 줘.",
  "慶州行きのKTXを教えて",
  "Bantu saya merencanakan transportasi dari Seoul ke Busan.",
];

describe("safety guard", () => {
  it("9개 언어의 긴급 상황을 잡는다", () => {
    for (const message of EMERGENCIES) expect(checkSafety(message), message).toBe("emergency");
  });

  it("비자·외국인등록 같은 행정 질문은 범위 밖으로 분류한다", () => {
    for (const message of ADMIN) expect(checkSafety(message), message).toBe("out_of_scope");
  });

  it("일반 요청 10개에서는 오탐이 없다", () => {
    expect(NORMAL.filter((message) => checkSafety(message) !== "ok")).toEqual([]);
  });

  it("긴급이면 에이전트 루프를 실행하지 않고 기록을 남긴다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const llm = fakeLlm();

    const result = await runTurn({ db, boardId: board.id, language: "en", text: EMERGENCIES[0], createLlm: () => llm });

    expect(result).toEqual({ ok: true, safety: "emergency" });
    expect(llm.create).not.toHaveBeenCalled();
    expect(listEvents(db, board.id).some((event) => event.detail.agent_loop === "not_run")).toBe(true);
  });

  it("행정 질문도 루프 없이 1345 안내로 끝난다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const llm = fakeLlm();
    const result = await runTurn({ db, boardId: board.id, language: "en", text: ADMIN[0], createLlm: () => llm });
    expect(result).toEqual({ ok: true, safety: "out_of_scope" });
    expect(llm.create).not.toHaveBeenCalled();
  });
});
