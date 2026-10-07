import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { reproLine, runInfo, saveRunLog } from "./run-info";

describe("F2-21 검사 실행 기록", () => {
  it("F2-28 미추적 코드 내용 변경도 식별하고 같은 실행 ID가 충돌해도 원본을 덮어쓰지 않는다", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "majungi-fingerprint-"));
    const cwd = process.cwd();
    try {
      execFileSync("git", ["init", "-q", dir]);
      process.chdir(dir);
      writeFileSync("fixture.ts", "export const value = 1;\n");
      const before = runInfo().diffHash;
      writeFileSync("fixture.ts", "export const value = 2;\n");
      expect(runInfo().diffHash).not.toBe(before);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
      const file = saveRunLog("test", ["original"], "same-id");
      expect(() => saveRunLog("test", ["replacement"], "same-id")).toThrow();
      expect(readFileSync(file, "utf8")).toContain("original");
    } finally {
      vi.useRealTimers();
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("같은 이름으로 같은 날 두 번 남겨도 앞 기록을 덮어쓰지 않고, 종료 시각을 붙인다", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "majungi-runs-"));
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      const a = saveRunLog("scenarios", ["# first"]);
      const b = saveRunLog("scenarios", ["# second"]);
      expect(a).not.toBe(b);
      expect(readdirSync(path.join(dir, "docs", "qa-runs"))).toHaveLength(2);
      expect(readFileSync(a, "utf8")).toMatch(/# first\n- 종료: \d{4}-/);
    } finally {
      process.chdir(cwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("재현 줄에 전체 SHA·변경 여부·옵션·실행 ID가 있고 키 값은 없다", () => {
    const info = runInfo();
    const line = reproLine(info);
    expect(line).toContain(info.sha);
    expect(line).toContain(info.runId);
    expect(info.dirty ? /커밋 전 변경 \d+개 파일/.test(line) : /변경 없음/.test(line)).toBe(true);
    for (const key of ["GEMINI_API_KEY", "ODSAY_API_KEY", "DATA_GO_KR_SERVICE_KEY", "RESEND_API_KEY"]) {
      const value = process.env[key];
      if (value) expect(line).not.toContain(value);
    }
  });
});
