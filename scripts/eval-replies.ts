// 사용법: npm run eval:replies
// 가상 회신 20개를 실제 Claude로 분류해 정확도를 출력한다 (BACKLOG M10 완료 기준: 85% 이상).
import Anthropic from "@anthropic-ai/sdk";
import { GeminiApiError } from "../lib/agent/gemini";
import { MissingApiKeyError } from "../lib/agent/llm";
import { createLlmClient } from "../lib/agent/provider";
import { interpretReply } from "../lib/requests/replies";
import { loadRequestTypes } from "../lib/request-types/loader";
import { draftFacts } from "../lib/requests/drafting";
import { LATE_CHECKIN_REPLIES } from "../tests/fixtures/late-checkin-replies";
import { REVIEW_FACTS, REVIEW_REPLIES } from "../tests/fixtures/review-replies";
import { runInfo, saveRunLog } from "./qa/run-info";

try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 아래에서 안내한다
}

async function main() {
  let llm;
  try {
    llm = createLlmClient();
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;

  let correct = 0;
  let flagged = 0;
  let skipped = 0;
  // REVIEW_ONLY=1 이면 R01~R08만 다시 돌린다
  for (const [i, sample] of (process.env.REVIEW_ONLY ? [] : LATE_CHECKIN_REPLIES).entries()) {
    try {
      const result = await interpretReply(llm, type, sample.raw_ko, "en");
      const ok = result.class === sample.label;
      if (ok) correct++;
      if (result.needs_user_check) flagged++;
      console.log(
        `${ok ? "✓" : "✗"} ${String(i + 1).padStart(2)} 정답 ${sample.label.padEnd(14)} 예측 ${result.class.padEnd(14)} 신뢰도 ${result.confidence.toFixed(2)}${result.needs_user_check ? " (이용자 확인)" : ""}`,
      );
    } catch (error) {
      // 공급자 오류(지연·사용 한도)는 판정하지 않고 미실행으로 센다
      if (error instanceof Anthropic.APIError || error instanceof GeminiApiError) {
        skipped++;
        console.log(`- ${String(i + 1).padStart(2)} 미실행 (LLM API 오류 ${error.status})`);
        continue;
      }
      throw error;
    }
  }
  const ran = LATE_CHECKIN_REPLIES.length - skipped;
  const accuracy = process.env.REVIEW_ONLY ? 1 : ran ? correct / ran : 0;
  console.log(
    `\n정확도 ${correct}/${ran} = ${(accuracy * 100).toFixed(0)}% (목표 85%), 이용자 확인으로 넘어간 회신 ${flagged}개${skipped ? `, 미실행 ${skipped}개` : ""}`,
  );

  // R01~R08: 요청한 날짜·시각과 함께 해석한다. 모호한 회신(R05~R08)은 이용자 확인으로 넘어가야 통과다.
  // 모델 출력이 실행마다 달라질 수 있어 RUNS번 반복하고 실행별 결과를 모두 남긴다 (기본 1번)
  const runs = Math.max(1, Number(process.env.RUNS ?? 1));
  const info = runInfo();
  const log: string[] = [
    "# 회신 해석 검사 기록 (실제 LLM)",
    "",
    `- 코드: ${info.commit} · Node ${info.node}`,
    `- LLM: ${info.provider} · ${info.model}`,
    `- 요청 사실: 체크인 ${REVIEW_FACTS.check_in_date}, 호텔 도착 ${REVIEW_FACTS.expected_arrival} (가상 예약 ${REVIEW_FACTS.booking_ref})`,
    `- 기존 20개: ${process.env.REVIEW_ONLY ? "실행 안 함 (REVIEW_ONLY)" : `분류 ${correct}/${ran}, 이용자 확인으로 넘어감 ${flagged}개${skipped ? `, 미실행 ${skipped}개 (LLM API 오류)` : ""}`}`,
    `- R01~R08 반복: ${runs}회 · 시작 ${info.startedAt}`,
    "",
    "보드 완료: 자동 처리될 때의 요청 상태. 이용자 확인으로 넘어가면 회신 대기로 남는다. 늦은 체크인 체크리스트는 done일 때만 완료다.",
    "",
    "| 실행 | 회신 | 기대 | 분류 | 분류 일치 | 이용자 확인 | 보드 상태 | 판정 |",
    "|---|---|---|---|---|---|---|---|",
  ];
  const tally = new Map<string, number>();
  let errors = 0;
  for (let run = 1; run <= runs; run++) {
    console.log(`\n[R01~R08 검토용 회신 · 실행 ${run}/${runs}]`);
    for (const sample of REVIEW_REPLIES) {
      let result;
      try {
        result = await interpretReply(llm, type, sample.raw_ko, "ko", draftFacts(REVIEW_FACTS));
      } catch (error) {
        // API 과부하·오류는 통과도 실패도 아니라 미실행으로 남긴다
        const reason = error instanceof Error ? error.message.split("\n")[0].slice(0, 80) : String(error);
        errors++;
        log.push(`| ${run} | ${sample.id} | ${sample.expect.needsCheck ? "확인 필요" : sample.expect.class} | - | - | - | - | 미실행 (API 오류: ${reason}) |`);
        console.log(`· ${sample.id} 미실행 (API 오류)`);
        continue;
      }
      const expectCheck = sample.expect.needsCheck;
      const classOk = expectCheck ? null : result.class === sample.expect.class;
      const ok = expectCheck ? result.needs_user_check : !result.needs_user_check && classOk === true;
      if (ok) tally.set(sample.id, (tally.get(sample.id) ?? 0) + 1);
      const boardState = result.needs_user_check ? "awaiting_reply (확인 대기)" : result.class;
      const verdict = ok ? "통과" : expectCheck ? "실패" : classOk ? "분류 일치 / 자동 처리 기준 미충족" : "실패";
      log.push(
        `| ${run} | ${sample.id} | ${expectCheck ? "확인 필요" : sample.expect.class} | ${result.class} | ${classOk === null ? "-" : classOk ? "예" : "아니오"} | ${result.needs_user_check ? "예" : "아니오"} | ${boardState} | ${verdict} |`,
      );
      console.log(`${ok ? "✓" : "✗"} ${sample.id} ${verdict} · 분류 ${result.class} · 확인 ${result.needs_user_check ? "예" : "아니오"}\n    ${result.summary}`);
    }
  }
  log.push("", "## 회신별 통과 횟수", "");
  for (const sample of REVIEW_REPLIES) log.push(`- ${sample.id}: ${tally.get(sample.id) ?? 0}/${runs}`);
  if (errors > 0) log.push("", `API 오류로 실행하지 못한 회신: ${errors}건 (통과 횟수의 분모에 포함되어 있으니 미실행 행을 함께 볼 것)`);
  const file = saveRunLog("replies", log);
  console.log(`\n기록: ${file}`);
  const allPass = REVIEW_REPLIES.every((sample) => (tally.get(sample.id) ?? 0) === runs);
  // 미실행이 있으면 통과라고 하지 않는다
  process.exit(accuracy >= 0.85 && allPass && skipped === 0 ? 0 : 1);
}

main();
