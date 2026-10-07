import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GEMINI_FALLBACKS_DEFAULT, GEMINI_MODEL_DEFAULT } from "../../lib/agent/gemini";
import { llmProvider } from "../../lib/agent/provider";

// 검사 실행 기록의 머리말: 코드 버전·환경·모델·발송 모드. 키 값이나 환경변수 값(모델 이름 제외)은 적지 않는다.
export function runInfo() {
  const commit = (() => {
    try {
      const head = execSync("git rev-parse --short HEAD", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      const dirty = execSync("git status --porcelain", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() ? " + 커밋 전 변경" : "";
      return `${head}${dirty}`;
    } catch {
      return "알 수 없음";
    }
  })();
  const provider = llmProvider();
  const model =
    provider === "gemini"
      ? `${process.env.GEMINI_MODEL || GEMINI_MODEL_DEFAULT} (예비: ${(process.env.GEMINI_FALLBACK_MODELS?.split(",") ?? GEMINI_FALLBACKS_DEFAULT).join(", ")})`
      : "Claude (lib/agent/llm.ts MODEL)";
  // 재현 근거: 전체 SHA, 커밋 전 변경 여부·파일 수, 변경 내용의 해시(내용은 적지 않는다). 변경 중이면 SHA만으로는 재현되지 않는다
  const git = (args: string) => {
    try {
      return execSync(`git ${args}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      return "";
    }
  };
  const changed = git("status --porcelain").split("\n").filter(Boolean);
  const untracked = git("ls-files --others --exclude-standard -z").split("\0").filter(Boolean).sort();
  const hash = createHash("sha256").update(git("diff HEAD -- . ':!**/.env*' ':!.env*'"));
  for (const file of untracked) {
    hash.update(file);
    // 비밀 설정과 바이너리는 읽지 않는다. 새 코드·문서·검사 자료는 이름뿐 아니라 내용도 식별한다.
    if (!path.basename(file).startsWith(".env") && /\.(?:tsx?|mts|json|ya?ml|md|css)$/.test(file) && lstatSync(file).isFile()) hash.update(readFileSync(file));
  }
  const diffHash = changed.length ? hash.digest("hex").slice(0, 12) : "";
  const runId = randomBytes(3).toString("hex");
  return {
    commit,
    sha: git("rev-parse HEAD") || "알 수 없음",
    dirty: changed.length > 0,
    changedFiles: changed.length,
    diffHash,
    runId,
    command: process.argv.slice(2).join(" ") || "(옵션 없음)",
    node: process.version,
    provider,
    model,
    mailMode: process.env.MAIL_MODE ?? "mock",
    startedAt: new Date().toISOString(),
  };
}

// 실행 기록 머리말에 넣는 재현 정보 한 줄
export const reproLine = (info: ReturnType<typeof runInfo>) =>
  `- 재현: 커밋 ${info.sha}${info.dirty ? ` + 커밋 전 변경 ${info.changedFiles}개 파일(변경 해시 ${info.diffHash}, 이 상태는 SHA만으로 재현되지 않음)` : " (변경 없음)"} · 옵션 ${info.command} · 실행 ID ${info.runId}`;

// docs/qa-runs/<날짜>-<KST 시각>-<이름>-<실행 ID>.md 로 남긴다. 같은 날 다시 실행해도 앞 기록을 덮어쓰지 않는다
export function saveRunLog(name: string, lines: string[], runId = randomBytes(3).toString("hex")) {
  const dir = path.join(process.cwd(), "docs", "qa-runs");
  mkdirSync(dir, { recursive: true });
  const kst = new Date(Date.now() + 9 * 3_600_000).toISOString();
  const file = path.join(dir, `${kst.slice(0, 10)}-${kst.slice(11, 19).replace(/:/g, "")}-${name}-${runId}.md`);
  writeFileSync(file, `${lines.join("\n")}\n- 종료: ${new Date().toISOString()}\n`, { flag: "wx" });
  return file;
}
