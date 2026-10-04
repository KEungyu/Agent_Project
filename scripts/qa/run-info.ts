import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GEMINI_FALLBACKS_DEFAULT, GEMINI_MODEL_DEFAULT } from "../../lib/agent/gemini";
import { llmProvider } from "../../lib/agent/provider";

// 검사 실행 기록의 머리말: 코드 버전·환경·모델·발송 모드. 키 값이나 환경변수 값(모델 이름 제외)은 적지 않는다.
export function runInfo() {
  const commit = (() => {
    try {
      const head = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
      const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim() ? " + 커밋 전 변경" : "";
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
  return {
    commit,
    node: process.version,
    provider,
    model,
    mailMode: process.env.MAIL_MODE ?? "mock",
    startedAt: new Date().toISOString(),
  };
}

// docs/qa-runs/<날짜>-<이름>.md 로 남긴다
export function saveRunLog(name: string, lines: string[]) {
  const dir = path.join(process.cwd(), "docs", "qa-runs");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}-${name}.md`);
  writeFileSync(file, `${lines.join("\n")}\n`);
  return file;
}
