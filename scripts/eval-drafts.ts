// 사용법: npm run eval:drafts
// 실제 Claude로 늦은 체크인 초안 3개를 만들고 점검 결과를 출력한다 (BACKLOG M8 완료 기준).
import { createClaudeClient, MissingApiKeyError } from "../lib/agent/llm";
import { composeDraft } from "../lib/requests/drafting";
import { loadRequestTypes } from "../lib/request-types/loader";
import { LATE_CHECKIN_FIXTURES } from "../tests/fixtures/late-checkin-slots";

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

  let failures = 0;
  for (const fixture of LATE_CHECKIN_FIXTURES) {
    console.log(`\n=== ${fixture.persona}`);
    try {
      const { draft, checks } = await composeDraft(llm, type, fixture.slots, fixture.language);
      console.log(`제목: ${draft.subject_ko}\n${draft.body_ko}\n(${draft.body_ko.length}자)`);
      console.log(`\n[역번역]\n${draft.back_translation}`);
      console.log(`\n[점검] ${checks.join("  ")}`);
    } catch (error) {
      failures++;
      console.log(`✗ ${(error as Error).message}`);
    }
  }
  console.log(`\n결과: ${LATE_CHECKIN_FIXTURES.length - failures}/${LATE_CHECKIN_FIXTURES.length} 통과`);
  process.exit(failures ? 1 : 0);
}

main();
