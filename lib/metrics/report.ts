import { listEvents } from "../board/store";
import type { Request, RequestStatus } from "../board/types";
import type { Db } from "../db/client";
import { getLatestReply } from "../requests/replies";
import { getHistory } from "../requests/state";

// AI 적용 전/후 지표 (PRD §6). 적용 전은 PRD §5-1의 예상치, 적용 후는 이벤트·상태 이력에서 계산한다.

export const BEFORE = {
  steps: 9,
  activeMinutes: 58,
  toolSwitches: 10,
  reAsks: 3,
  source: "PRD §5-1 예상치 (회신 대기 시간 제외)",
} as const;

const FINISHED: RequestStatus[] = ["done", "conditional", "declined"];

export type RequestMetrics = {
  request_id: string;
  type_id: string;
  status: RequestStatus;
  steps: number; // 이용자 조작 수
  activeMinutes: number; // 전체 경과 시간 - 회신 대기 시간. 이용자가 직접 조작한 시간(능동 시간)이 아니다 — 그건 관찰자가 따로 잰다
  waitingMinutes: number;
  toolSwitches: number; // 외부 링크로 나간 횟수
  reAsks: number; // 보드에 있던 값을 다시 물으려 한 횟수
  replyNeededUser: boolean | null; // 회신 분류에 이용자 확인이 필요했는가 (회신이 없으면 null)
};

const minutesBetween = (from: string, to: string) => Math.max(0, (Date.parse(to) - Date.parse(from)) / 60_000);
const round1 = (value: number) => Math.round(value * 10) / 10;

export function requestMetrics(db: Db, boardId: string, request: Request): RequestMetrics {
  const history = getHistory(db, request.id);
  const events = listEvents(db, boardId);
  const created = history[0]?.at ?? request.created_at;
  // 요청을 만든 채팅(요청 생성 직전의 마지막 채팅)부터 센다
  const start =
    events.filter((event) => event.kind === "user_action" && event.detail.action === "chat" && event.at <= created).at(-1)?.at ??
    created;
  const end = history.at(-1)?.at ?? request.updated_at;
  const within = events.filter((event) => event.at >= start && event.at <= end);

  const sentAt = history.find((entry) => entry.to === "awaiting_reply")?.at;
  const reply = getLatestReply(db, request.id);
  const waitingMinutes = sentAt && reply ? minutesBetween(sentAt, reply.received_at) : 0;

  // 처음 분류를 따로 저장하지 않으므로 "바꿨는가"는 알 수 없다. 이용자 확인이 필요했는지만 센다.
  const replyNeededUser = reply?.interpretation ? Boolean(reply.interpretation.confirmed_by_user) : null;

  return {
    request_id: request.id,
    type_id: request.type_id,
    status: request.status,
    steps: within.filter((event) => event.kind === "user_action" && event.detail.action !== "safety_guard").length,
    activeMinutes: round1(Math.max(0, minutesBetween(start, end) - waitingMinutes)),
    waitingMinutes: round1(waitingMinutes),
    toolSwitches: within.filter((event) => event.kind === "external_link").length,
    reAsks: within.filter((event) => event.kind === "re_ask").length,
    replyNeededUser,
  };
}

export function boardReport(db: Db, boardId: string, requests: Request[]) {
  const rows = requests.filter((request) => FINISHED.includes(request.status)).map((request) => requestMetrics(db, boardId, request));
  const average = (pick: (row: RequestMetrics) => number) =>
    rows.length ? round1(rows.reduce((sum, row) => sum + pick(row), 0) / rows.length) : null;
  const replied = rows.filter((row) => row.replyNeededUser !== null);
  // 결과별 건수: 평균은 "처리에 든 비용"이라 해결·조건부·거절을 모두 넣지만, 해결 건수와는 따로 보여 준다
  // (해결 = 이 문의가 해결됨. 새 예약·실제 투숙·여행 목표 달성이 아니다. 시연 자료는 모의 발송·예시 회신이다)
  const outcomes = {
    done: rows.filter((row) => row.status === "done").length,
    conditional: rows.filter((row) => row.status === "conditional").length,
    declined: rows.filter((row) => row.status === "declined").length,
  };
  return {
    rows,
    outcomes,
    after: {
      steps: average((row) => row.steps),
      activeMinutes: average((row) => row.activeMinutes),
      toolSwitches: average((row) => row.toolSwitches),
      reAsks: average((row) => row.reAsks),
      repliesNeedingUser: replied.filter((row) => row.replyNeededUser).length,
      replies: replied.length,
    },
  };
}
