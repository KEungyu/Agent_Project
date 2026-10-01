import type { RequestType } from "@/lib/request-types/schema";

type Level = RequestType["execution_level"];

// PRD §4 실행 단계. "확정"은 범위 밖이라 배지가 없다.
const BADGES: Record<Level, { label: string; className: string; description: string }> = {
  안내: { label: "Info", className: "badge badge-info", description: "Information and official links" },
  준비: { label: "Prep", className: "badge badge-prep", description: "We prepare it in Korean; you finish on the official site" },
  대행: { label: "We send it", className: "badge badge-act", description: "Majung sends the request after your approval and reads the reply" },
};

export const EXECUTION_LEVELS = Object.keys(BADGES) as Level[];

export function ExecutionBadge({ level }: { level: Level }) {
  const badge = BADGES[level];
  return (
    <span className={badge.className} title={badge.description}>
      {badge.label}
      <span className="badge-ko">{level}</span>
    </span>
  );
}
