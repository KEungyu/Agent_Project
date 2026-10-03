// 사용법: npm run eval:replies
// 가상 회신 20개를 실제 Claude로 분류해 정확도를 출력한다 (BACKLOG M10 완료 기준: 85% 이상).
import Anthropic from "@anthropic-ai/sdk";
import { MissingApiKeyError } from "../lib/agent/llm";
import { createLlmClient } from "../lib/agent/provider";
import { interpretReply } from "../lib/requests/replies";
import { loadRequestTypes } from "../lib/request-types/loader";
import { draftFacts } from "../lib/requests/drafting";
import { LATE_CHECKIN_REPLIES } from "../tests/fixtures/late-checkin-replies";
import { REVIEW_FACTS, REVIEW_REPLIES } from "../tests/fixtures/review-replies";

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
      if (error instanceof Anthropic.APIError) {
        console.error(`Claude API 오류 ${error.status}: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  }
  const accuracy = process.env.REVIEW_ONLY ? 1 : correct / LATE_CHECKIN_REPLIES.length;
  console.log(`\n정확도 ${correct}/${LATE_CHECKIN_REPLIES.length} = ${(accuracy * 100).toFixed(0)}% (목표 85%), 이용자 확인으로 넘어간 회신 ${flagged}개`);

  // R01~R08: 요청한 날짜·시각과 함께 해석한다. 모호한 회신(R05~R08)은 이용자 확인으로 넘어가야 통과다
  console.log("\n[R01~R08 검토용 회신]");
  let reviewPass = 0;
  for (const sample of REVIEW_REPLIES) {
    const result = await interpretReply(llm, type, sample.raw_ko, "ko", draftFacts(REVIEW_FACTS));
    const ok = sample.expect.needsCheck ? result.needs_user_check : !result.needs_user_check && result.class === sample.expect.class;
    if (ok) reviewPass++;
    console.log(
      `${ok ? "✓" : "✗"} ${sample.id} 기대 ${sample.expect.needsCheck ? "확인 필요" : sample.expect.class} · 예측 ${result.class} 신뢰도 ${result.confidence.toFixed(2)}${result.needs_user_check ? " (이용자 확인)" : ""}\n    ${result.summary}`,
    );
  }
  console.log(`\nR01~R08 ${reviewPass}/${REVIEW_REPLIES.length}`);
  process.exit(accuracy >= 0.85 && reviewPass === REVIEW_REPLIES.length ? 0 : 1);
}

main();
