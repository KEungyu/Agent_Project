import type { Messages } from "@/lib/i18n/messages";
import type { RequestType } from "@/lib/request-types/schema";

export type Level = RequestType["execution_level"];

// PRD §4 실행 단계를 지하철 노선 색으로 부호화한다. "확정"은 범위 밖이라 배지가 없다.
export const LEVEL_KEY: Record<Level, "info" | "prep" | "act"> = { 안내: "info", 준비: "prep", 대행: "act" };
export const EXECUTION_LEVELS = Object.keys(LEVEL_KEY) as Level[];

export function ExecutionBadge({ level, m }: { level: Level; m: Messages }) {
  const key = LEVEL_KEY[level];
  const badge = m.badges[key];
  return (
    <span className={`line-pill line-${key}`} title={badge.description}>
      <span lang="ko" className="line-pill-ko">
        {level}
      </span>
      {badge.label !== level && <span className="line-pill-label">{badge.label}</span>}
    </span>
  );
}
