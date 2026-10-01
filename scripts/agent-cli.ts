// 사용법: npm run agent -- [--demo] "메시지"
//   --demo  메모리 DB에 시연용 보드(Emma)를 만들어 실행한다. 없으면 data/majung.db의 보드를 쓴다.
import { getCurrentBoard } from "../lib/board/store";
import { seedDemoBoard } from "../lib/board/demo";
import { createTools } from "../lib/agent/registry";
import { createClaudeClient, MissingApiKeyError } from "../lib/agent/llm";
import { runAgent } from "../lib/agent/loop";
import { openDb } from "../lib/db/client";

try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 아래에서 키 없음 오류로 안내한다
}

const args = process.argv.slice(2);
const demo = args.includes("--demo");
const message = args.filter((arg) => arg !== "--demo").join(" ").trim();
if (!message) {
  console.error('사용법: npm run agent -- [--demo] "메시지"');
  process.exit(1);
}

const db = demo ? openDb(":memory:") : openDb();
const board = demo ? seedDemoBoard(db) : getCurrentBoard(db);
if (!board) {
  console.error("보드가 없습니다. --demo로 실행하거나 화면에서 보드를 먼저 만드세요.");
  process.exit(1);
}

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

runAgent({
  llm,
  tools: createTools(),
  ctx: { db, boardId: board.id },
  messages: [{ role: "user", content: message }],
}).then((result) => console.log(`\n${result.reply}`));
