// 사용법: npm run eval:replies
// 가상 회신 20개를 실제 Claude로 분류해 정확도를 출력한다 (BACKLOG M10 완료 기준: 85% 이상).
import Anthropic from "@anthropic-ai/sdk";
import { createClaudeClient, MissingApiKeyError } from "../lib/agent/llm";
import { interpretReply } from "../lib/requests/replies";
import { loadRequestTypes } from "../lib/request-types/loader";
import { LATE_CHECKIN_REPLIES } from "../tests/fixtures/late-checkin-replies";

try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 아래에서 안내한다
}

async function main() {
  let llm;
  try {
    llm = createClaudeClient();
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
  const type = loadRequestTypes().types.find((candidate) => candidate.id === "late_checkin")!;

  let correct = 0;
  for (const [i, sample] of LATE_CHECKIN_REPLIES.entries()) {
    try {
      const result = await interpretReply(llm, type, sample.raw_ko, "en");
      const ok = result.class === sample.label;
      if (ok) correct++;
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
  const accuracy = correct / LATE_CHECKIN_REPLIES.length;
  console.log(`\n정확도 ${correct}/${LATE_CHECKIN_REPLIES.length} = ${(accuracy * 100).toFixed(0)}% (목표 85%)`);
  process.exit(accuracy >= 0.85 ? 0 : 1);
}

main();
