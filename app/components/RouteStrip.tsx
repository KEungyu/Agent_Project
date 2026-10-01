import type { RequestStatus } from "@/lib/board/types";
import type { Messages } from "@/lib/i18n/messages";

// 요청 하나를 노선 하나로 그린다: 초안 → 승인 대기 → 발송됨 → 회신 대기 → 결과.
// 상태가 바뀌면 같은 DOM의 --pos만 바뀌어 열차 표시가 다음 역으로 미끄러진다(CSS transition).

const STATIONS: RequestStatus[] = ["draft", "pending_approval", "sent", "awaiting_reply"];
const OUTCOMES: RequestStatus[] = ["done", "conditional", "declined", "info_requested"];

export function RouteStrip({ status, line, m }: { status: RequestStatus; line: string; m: Messages }) {
  const outcome = OUTCOMES.includes(status) ? status : null;
  const current = outcome ? STATIONS.length : STATIONS.indexOf(status);
  const stops = [...STATIONS, outcome ?? "done"];
  const pos = current / (stops.length - 1);

  return (
    <div className={`route route-${line}`} style={{ "--pos": pos } as React.CSSProperties}>
      <div className="route-track" aria-hidden="true">
        <span className="route-done" />
        <span className="route-train" />
      </div>
      <ol className="route-stops">
        {stops.map((stop, i) => (
          <li
            key={i}
            className={`route-stop ${i < current ? "is-passed" : ""} ${i === current ? "is-current" : ""} ${
              i === stops.length - 1 && outcome ? `is-outcome outcome-${outcome}` : ""
            }`}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="route-dot" aria-hidden="true" />
            <span className="route-label">{m.status[stop]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
