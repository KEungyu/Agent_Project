// 사용법: npm run qa:scenarios -- [검사 ID ...]
//   예) npm run qa:scenarios -- T02 T04-ja T06
// 실제 LLM(.env의 공급자)으로 대화 시나리오를 실행한다. 가상 예약만 쓰고, 기준 시각을 고정하며, 메일은 보내지 않는다(모의 모드).
// 2026-10-04 검토에서 새로 작성한 재현 스크립트다. 과거(삭제된) 임시 스크립트를 복구한 것이 아니므로 과거 실행을 증명하지 않는다.
// 결과는 docs/qa-runs/<날짜>-scenarios.md 에 남는다.
import type Anthropic from "@anthropic-ai/sdk";
import { createTools } from "../../lib/agent/registry";
import { runAgent } from "../../lib/agent/loop";
import { checkSafety } from "../../lib/safety/guard";
import { createLlmClient } from "../../lib/agent/provider";
import { addStay, createBoard, getBoard, updateBoard } from "../../lib/board/store";
import { openDb, type Db } from "../../lib/db/client";
import { fmt, getMessages } from "../../lib/i18n/messages";
import { retranslateDraft } from "../../lib/requests/approval";
import { loadRequestTypes } from "../../lib/request-types/loader";
import {
  FIRST_MESSAGE,
  FIXED_NOW,
  NARROW_EDITS,
  REVIEW_ARRIVAL_AT_HOTEL,
  REVIEW_FLIGHT_ARRIVAL,
  REVIEW_STAY,
} from "../../tests/fixtures/review-booking";
import { reproLine, runInfo, saveRunLog } from "./run-info";

try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 공급자 키 없음 오류로 끝난다
}

const LEAK = /req_[0-9a-f-]{6,}|redraft|board_get|check_conditions|board_update|draft_request|ask_user/;
const log: string[] = [];
const results: { id: string; pass: number; fail: number }[] = [];
const say = (line: string) => {
  console.log(line);
  log.push(line);
};

type Session = { db: Db; boardId: string; language: string; messages: Anthropic.Beta.BetaMessageParam[] };
const llm = createLlmClient();

function session(language: string, stay: object, extra: object = {}): Session {
  const db = openDb(":memory:");
  const board = createBoard(db, extra as never);
  updateBoard(db, board.id, { user_language: language });
  addStay(db, board.id, stay as never, "user");
  return { db, boardId: board.id, language, messages: [] };
}

async function turn(s: Session, text: string, now: string) {
  // 실제 채팅(runTurn)과 같이 안전 가드를 먼저 거친다. 가드에서 멈추면 에이전트를 실행하지 않는다
  const verdict = checkSafety(text);
  if (verdict !== "ok") {
    say(`  · 안전 가드: ${verdict} (에이전트 실행 안 함)`);
    return { reply: "", toolCalls: [] as { name: string; ok: boolean; output: unknown }[], messages: s.messages, safety: verdict };
  }
  s.messages.push({ role: "user", content: text });
  const r = await runAgent({
    llm,
    tools: createTools(),
    ctx: { db: s.db, boardId: s.boardId, now: () => new Date(now), latestUserText: text },
    language: s.language,
    messages: s.messages,
    log: () => {},
  });
  s.messages = r.messages;
  if (r.reply && r.messages.at(-1)?.role === "user") s.messages.push({ role: "assistant", content: [{ type: "text", text: r.reply }] });
  say(`  · 도구: ${r.toolCalls.map((c) => `${c.name}${c.ok ? "" : "(오류)"}`).join(", ") || "없음"}`);
  // 실패한 도구의 오류 내용을 남겨, LLM 공급자 지연인지 앱 규칙에 걸린 것인지 구분한다
  for (const c of r.toolCalls.filter((call) => !call.ok)) say(`  · 오류(${c.name}): ${JSON.stringify(c.output).slice(0, 240)}`);
  say(`  · 답: ${r.reply.replace(/\n/g, " ⏎ ")}`);
  return r;
}

const board = (s: Session) => getBoard(s.db, s.boardId)!;
let current = "";
function check(name: string, ok: boolean, detail = "") {
  say(`  ${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  const row = results.find((r) => r.id === current)!;
  if (ok) row.pass++;
  else row.fail++;
}
function start(id: string, title: string) {
  current = id;
  results.push({ id, pass: 0, fail: 0 });
  say(`\n### ${id} ${title}`);
}

const typeLabel = (lang: string) => loadRequestTypes().types.find((t) => t.id === "late_checkin")!.label[lang];

async function firstDraft(language: string) {
  const s = session(language, { ...REVIEW_STAY, expected_arrival: REVIEW_ARRIVAL_AT_HOTEL });
  const r = await turn(s, FIRST_MESSAGE, FIXED_NOW.beforeTrip);
  return { s, r };
}

const SCENARIOS: Record<string, (id?: string) => Promise<void>> = {
  async T02() {
    start("T02", "저장 숙소 재사용 + 자정 날짜 (en, 기준 2026-10-08 12:00 KST)");
    const { s, r } = await firstDraft("en");
    const b = board(s);
    const req = b.requests[0];
    const body = req?.draft?.body_ko ?? "";
    check("숙소 1개", b.stays.length === 1);
    check("요청 1개·승인 대기·발송 없음", b.requests.length === 1 && req?.status === "pending_approval" && !req.sent);
    check("미입력 값(Seoul Hotel/ABC12345) 없음", !/Seoul Hotel|ABC12345/.test(JSON.stringify(b)));
    check("원문: 체크인 2026년 10월 9일 / 도착 2026년 10월 10일 01:00 KST", /2026년 10월 9일/.test(body) && /2026년 10월 10일/.test(body) && body.includes("01:00") && body.includes("KST"));
    check("보드 날짜 유지", b.stays[0].check_in_date === "2026-10-09" && b.stays[0].check_out_date === "2026-10-11");
    check("번역에 연도·01:00·KST", /2026/.test(req?.draft?.back_translation ?? "") && /01:00/.test(req?.draft?.back_translation ?? "") && /KST/.test(req?.draft?.back_translation ?? ""));
    check("한국어 능력 언급 없음", !/한국어/.test(body));
    check("답에 내부 이름·요청 ID 없음", !LEAK.test(r.reply));
    say(`  · 원문: ${body.replace(/\n/g, " ")}`);
  },

  ...Object.fromEntries(
    (Object.keys(NARROW_EDITS) as (keyof typeof NARROW_EDITS)[]).map((code) => [
      `T04-${code}`,
      async () => {
        start(`T04-${code}`, `좁은 수정 (${code}, 요청 카드 '고쳐 주세요' 경로)`);
        const { s, r: first } = await firstDraft(code);
        // 첫 초안이 없으면(LLM 공급자 지연 등) 이 검사를 진행할 수 없다: 이유를 남기고 멈춘다
        const before = board(s).requests[0]?.draft;
        if (!before) {
          check("첫 초안 생성", false, `초안 없음 — 도구: ${first.toolCalls.map((c) => `${c.name}${c.ok ? "" : "(오류)"}`).join(", ")}`);
          return;
        }
        const message = fmt(getMessages(code).approval.changeMessage, { type: typeLabel(code), where: REVIEW_STAY.name, note: NARROW_EDITS[code] });
        check("채팅 메시지에 요청 ID·내부 지시문 없음", !LEAK.test(message));
        const r = await turn(s, message, FIXED_NOW.beforeTrip);
        const b = board(s);
        const after = b.requests[0];
        const body = after.draft?.body_ko ?? "";
        check("요청 1개·숙소 1개·승인 대기", b.requests.length === 1 && b.stays.length === 1 && after.status === "pending_approval");
        check("보드: 도착만 02:00, 체크인·체크아웃 유지", Date.parse(b.stays[0].expected_arrival ?? "") === Date.parse("2026-10-10T02:00+09:00") && b.stays[0].check_in_date === "2026-10-09" && b.stays[0].check_out_date === "2026-10-11");
        check("원문 02:00, 01:00 없음, 2026년 10월 9일 유지", body.includes("02:00") && !body.includes("01:00") && /2026년 10월 9일/.test(body));
        check("수신처 유지", b.stays[0].email === REVIEW_STAY.email);
        const label = { ja: "件名:", "zh-CN": "主题:", fr: "Objet:" }[code];
        check(`번역 제목 ${label}`, after.draft?.back_translation.startsWith(label) === true);
        const sentences = (text: string) => text.split(/(?<=[.다요])\s+/).map((x) => x.trim()).filter(Boolean);
        const kept = sentences(before.body_ko).filter((x) => body.includes(x)).length;
        say(`  · 수정 전 문장 ${sentences(before.body_ko).length}개 중 ${kept}개 유지`);
        check("답에 내부 이름 없음", !LEAK.test(r.reply));
        if (code === "ja") {
          start("T05", "재번역 (ja → zh-CN)");
          updateBoard(s.db, s.boardId, { user_language: "zh-CN" });
          const re = await retranslateDraft(s.db, llm, after.id, "zh-CN");
          check("원문·해시·보드 그대로", re.draft?.hash === after.draft?.hash && re.draft?.body_ko === body && board(s).stays.length === 1);
          check("번역 언어 zh-CN, 제목 主题:", re.draft?.back_translation_language === "zh-CN" && re.draft?.back_translation.startsWith("主题:") === true);
        }
      },
    ]),
  ),

  async T06() {
    start("T06", "오늘에 묶은 지난 새벽 시각 (ko, 기준 2026-10-09 21:00 KST)");
    const s = session("ko", REVIEW_STAY);
    const r = await turn(s, "오늘 새벽 2시에 호텔 도착할 것 같아. 늦은 체크인 가능한지 메일 써줘.", FIXED_NOW.eveningOfCheckIn);
    const b = board(s);
    check("날짜를 확정하지 않음 (요청 없음, 도착 미저장)", b.requests.length === 0 && !b.stays[0].expected_arrival);
    // F2-06: 확인 질문은 한 날짜(10월 10일)만 묻고 "오늘 새벽"과 섞지 않는다
    // 물음표로 끝나는 질문 문장만 본다 (이용자 말을 되짚는 "오늘 새벽 2시라고 하셨는데"는 질문이 아니다)
    const question = r.reply.split(/(?<=[?？])/).find((part) => /[?？]/.test(part)) ?? "";
    check("F2-06 확인 질문이 10월 10일 하나만 물음", /10월\s*10일|2026-10-10/.test(question) && !/오늘/.test(question), question.trim());
    check("F2-06 도착 시각으로 물음 (체크인과 섞지 않음)", /도착/.test(question) && !/체크인/.test(question));
    await turn(s, "응 맞아, 10월 10일 새벽 2시야.", "2026-10-09T21:01:00+09:00");
    const b2 = board(s);
    check("확인 뒤 10-10 02:00 저장·초안", Date.parse(b2.stays[0].expected_arrival ?? "") === Date.parse("2026-10-10T02:00+09:00") && b2.requests.length === 1);
  },

  async T07() {
    start("T07", "공항 도착과 호텔 도착 구분 (en, 기준 2026-10-08 12:00 KST)");
    const s = session("en", REVIEW_STAY, { arrival: REVIEW_FLIGHT_ARRIVAL });
    await turn(
      s,
      "My flight lands at 23:10 on 9 October 2026. I will get to the hotel at 01:00 on 10 October 2026, Korea time. Please prepare a Korean message asking about late check-in. Do not send any email.",
      FIXED_NOW.beforeTrip,
    );
    const b = board(s);
    const body = b.requests[0]?.draft?.body_ko ?? "";
    check("호텔 도착 10-10 01:00 저장", Date.parse(b.stays[0].expected_arrival ?? "") === Date.parse("2026-10-10T01:00+09:00"));
    check("원문에 01:00, 23:10 없음", body.includes("01:00") && !body.includes("23:10"));
    check("항공편 도착 23:10 유지", Date.parse(b.arrival?.datetime ?? "") === Date.parse(REVIEW_FLIGHT_ARRIVAL.datetime));
  },

  // ── 예약 의도 구분 (B·C·D 검사): 어느 도구를 불렀는지와 보드 변화만 본다 ──
  async B01() {
    start("B01", "새 숙소 예약 → Booking.com 연결 (en)");
    const s = session("en", REVIEW_STAY);
    const before = JSON.stringify(board(s).stays);
    const r = await turn(s, "I need a new hotel in Busan from 2026-10-12 to 2026-10-14, 2 adults, 1 room.", FIXED_NOW.beforeTrip);
    const names = r.toolCalls.map((c) => c.name);
    check("prepare_stay_booking 성공", r.toolCalls.some((c) => c.name === "prepare_stay_booking" && c.ok));
    check("메일 요청·식당 연결 없음", !names.includes("draft_request") && !names.includes("open_restaurant_booking"));
    check("기존 숙소 그대로", JSON.stringify(board(s).stays) === before);
    check("예약번호를 묻지 않음", !/booking (number|reference)|reservation number/i.test(r.reply));
  },

  // F2-07: 검토에서 긴급으로 오탐된 문장 그대로 ("help me" 포함) → 가드를 지나 Booking.com 연결
  async "F2-07"() {
    start("F2-07", "'Please help me book a NEW hotel…' → 긴급 오탐 없이 Booking.com 연결 (en)");
    const s = session("en", REVIEW_STAY);
    const r = await turn(s, "Please help me book a NEW hotel in Seoul from 2026-10-12 to 2026-10-14, 2 adults, 1 room.", FIXED_NOW.beforeTrip);
    check("안전 가드를 통과", !("safety" in r));
    check("prepare_stay_booking 성공", r.toolCalls.some((c) => c.name === "prepare_stay_booking" && c.ok));
  },

  async B02() {
    start("B02", "기존 예약 늦은 체크인 → 기존 요청 흐름 (en)");
    const { s, r } = await firstDraft("en");
    const names = r.toolCalls.map((c) => c.name);
    check("Booking.com·Catchtable 연결 없음", !names.includes("prepare_stay_booking") && !names.includes("open_restaurant_booking"));
    check("늦은 체크인 요청 1개 승인 대기", board(s).requests.length === 1 && board(s).requests[0].type_id === "late_checkin" && board(s).requests[0].status === "pending_approval");
    start("D07", "기존 호텔 늦은 체크인 → 새 예약·덮어쓰기 없음");
    const stay = board(s).stays;
    check("숙소 1개, 이름·예약번호·날짜 그대로", stay.length === 1 && stay[0].name === REVIEW_STAY.name && stay[0].booking_ref === REVIEW_STAY.booking_ref && stay[0].check_in_date === REVIEW_STAY.check_in_date && stay[0].check_out_date === REVIEW_STAY.check_out_date);
  },

  async C01() {
    start("C01", "'Please book a restaurant for two tomorrow at 7 pm.' → Catchtable 연결");
    const s = session("en", REVIEW_STAY);
    const r = await turn(s, "Please book a restaurant for two tomorrow at 7 pm.", FIXED_NOW.beforeTrip);
    const names = r.toolCalls.map((c) => c.name);
    check("open_restaurant_booking 성공", r.toolCalls.some((c) => c.name === "open_restaurant_booking" && c.ok));
    check("호텔 예약 경로·메일 초안 없음", !names.includes("prepare_stay_booking") && !names.includes("draft_request"));
    check("요청·발송 없음", board(s).requests.length === 0);
  },

  async C02() {
    start("C02", "'Take me to Catchtable in English.' → 질문 없이 연결");
    const s = session("en", REVIEW_STAY);
    const r = await turn(s, "Take me to Catchtable in English.", FIXED_NOW.beforeTrip);
    const names = r.toolCalls.map((c) => c.name);
    check("open_restaurant_booking 성공", r.toolCalls.some((c) => c.name === "open_restaurant_booking" && c.ok));
    check("조건 질문(ask_user) 없음", !names.includes("ask_user"));
  },

  async C03(id = "C03") {
    start(id, "추천 / 예약하지 마 / 취소 → 예약 화면 열지 않음");
    for (const text of ["Recommend restaurants near Myeongdong.", "Do not book a restaurant, just tell me what Korean BBQ is.", "Cancel my restaurant reservation."]) {
      const s = session("en", REVIEW_STAY);
      const r = await turn(s, text, FIXED_NOW.beforeTrip);
      const names = r.toolCalls.map((c) => c.name);
      check(`"${text}" → 예약 연결·요청 없음`, !names.includes("open_restaurant_booking") && !names.includes("prepare_stay_booking") && board(s).requests.length === 0);
    }
  },

  async "F2-33"() {
    await SCENARIOS.C03("F2-33");
  },

  async D10() {
    start("D10", "식당 지점 연락처와 숙소 연락처가 함께 있을 때 식당 것만 사용");
    const s = session("en", REVIEW_STAY);
    const r = await turn(
      s,
      "Please email Mingles, the Cheongdam branch, at reservation@mingles.test to book a table for 2 on 2026-10-10 at 19:00 under Emma Smith. Note: peanut allergy. Do not send it until I approve.",
      FIXED_NOW.beforeTrip,
    );
    const req = board(s).requests[0];
    const body = req?.draft?.body_ko ?? "";
    check("restaurant_booking 요청이 승인 대기", req?.type_id === "restaurant_booking" && req?.status === "pending_approval" && !req.sent);
    check("수신처는 식당 주소, 숙소 메일 아님", req?.slots.place_email === "reservation@mingles.test" && !body.includes(REVIEW_STAY.email ?? "@@"));
    check("알레르기 내용을 원문에 담음", /땅콩/.test(body));
    check("안전 보장 표현 없음", !/안전합니다|보장|문제없/.test(body));
    check("답에 내부 이름 없음", !LEAK.test(r.reply));
    say(`  · 원문: ${body.replace(/\n/g, " ")}`);
  },
};

async function main() {
  const wanted = process.argv.slice(2);
  const ids = wanted.length ? Object.keys(SCENARIOS).filter((id) => wanted.includes(id)) : Object.keys(SCENARIOS);
  const info = runInfo();
  say("# 대화 시나리오 실행 기록 (실제 LLM)");
  say("");
  say(`- 코드: ${info.commit} · Node ${info.node}`);
  say(reproLine(info));
  say("- 실제 호출: LLM(공급자 키) 사용 · 정보 API(ODsay·공항·지도) 사용 안 함 · 임시 메모리 DB · 모의 발송");
  say(`- LLM: ${info.provider} · ${info.model}`);
  say(`- 발송 모드: ${info.mailMode} (실제 발송 없음) · 가상 예약: ${REVIEW_STAY.name} / ${REVIEW_STAY.booking_ref}`);
  say(`- 고정 시각: 여행 전 ${FIXED_NOW.beforeTrip}, 체크인 날 밤 ${FIXED_NOW.eveningOfCheckIn}`);
  say(`- 시작: ${info.startedAt} · 실행 검사: ${ids.join(", ")}`);
  for (const id of ids) {
    try {
      await SCENARIOS[id]();
    } catch (error) {
      if (!results.find((r) => r.id === id)) start(id, "(시작 전 오류)");
      check("실행 오류 없이 끝남", false, error instanceof Error ? error.message.slice(0, 200) : String(error));
    }
  }
  say("\n## 요약");
  for (const r of results) say(`- ${r.id}: ${r.fail === 0 ? "통과" : "실패"} (PASS ${r.pass}, FAIL ${r.fail})`);
  const file = saveRunLog("scenarios", log, info.runId);
  console.log(`\n기록: ${file}`);
  process.exit(results.some((r) => r.fail > 0) ? 1 : 0);
}

main();
