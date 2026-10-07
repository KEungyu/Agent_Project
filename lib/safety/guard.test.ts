import { describe, expect, it } from "vitest";
import { fakeLlm, message, text } from "../agent/testing";
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

// F2-01: "help me"가 들어간 일반 부탁 (검토에서 긴급으로 오탐된 문장 포함)
const HELP_REQUESTS = [
  "Please help me book a NEW hotel in Seoul for Oct 12-14, 2 adults.",
  "Please help me book a hotel in Seoul.",
  "Please help me find the nearest subway station.",
  "Can you help me with my late check-in?",
  "호텔 예약 좀 도와줘",
  "ホテルの予約を手伝ってください",
  "帮我订一家首尔的酒店",
  "Aidez-moi à réserver un hôtel à Séoul",
  "Ayúdame a reservar un hotel en Seúl",
  "Giúp tôi đặt khách sạn ở Seoul",
  "Tolong bantu saya pesan hotel di Seoul",
  "ช่วยจองโรงแรมที่โซลหน่อย",
];
// F2-02: 도움 요청만 있고 무엇인지 모를 때 → 확인 (긴급 번호를 보여 주며 묻는다)
const CHECK_ONLY = ["Help!", "help me", "Please help!!", "SOS", "도와주세요!", "助けて", "帮帮我", "À l'aide !", "¡Ayúdame!", "Tolong!", "Giúp tôi!", "ช่วยด้วย"];
// F2-03: 실제 긴급 신호는 그대로
const CLEAR_EMERGENCIES = ["I cannot breathe. Please call an ambulance.", "Help me, I'm bleeding", "살려주세요", "Au secours, il y a un incendie", "Je suis blessé"];

describe("safety guard", () => {
  it("F2-01 'help me'가 들어간 일반 부탁은 막지 않는다", () => {
    expect(HELP_REQUESTS.filter((message) => checkSafety(message) !== "ok")).toEqual([]);
  });

  it("F2-02 도움 요청만 단독으로 오면 긴급 여부를 확인한다", () => {
    for (const message of CHECK_ONLY) expect(checkSafety(message), message).toBe("check");
  });

  it("F2-03 실제 긴급 신호는 계속 긴급이다", () => {
    for (const message of CLEAR_EMERGENCIES) expect(checkSafety(message), message).toBe("emergency");
  });

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

  it("F2-04 실제 채팅 경로: 일반 도움 부탁은 가드를 지나 에이전트까지 간다", async () => {
    const db = openDb(":memory:");
    const board = seedDemoBoard(db);
    const llm = fakeLlm([message([text("Sure, let's set up your new stay.")], "end_turn")]);
    const result = await runTurn({ db, boardId: board.id, language: "en", text: HELP_REQUESTS[0], createLlm: () => llm });
    expect(result.ok && "reply" in result).toBe(true);
    expect(llm.create).toHaveBeenCalled();
    expect(listEvents(db, board.id).some((event) => event.detail.action === "safety_guard")).toBe(false);
  });

  it("F2-05 실제 채팅 경로: 긴급·확인은 AI·예약·발송 도구를 실행하지 않는다", async () => {
    for (const [text, verdict] of [[CLEAR_EMERGENCIES[0], "emergency"], [CHECK_ONLY[0], "check"]] as const) {
      const db = openDb(":memory:");
      const board = seedDemoBoard(db);
      const llm = fakeLlm();
      const result = await runTurn({ db, boardId: board.id, language: "en", text, createLlm: () => llm });
      expect(result).toEqual({ ok: true, safety: verdict });
      expect(llm.create).not.toHaveBeenCalled();
      expect(db.$client.prepare("SELECT COUNT(*) AS n FROM requests").get()).toEqual({ n: 0 });
    }
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
