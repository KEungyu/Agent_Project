import type { Reply, Request, Stay } from "@/lib/board/types";
import { getLanguage } from "@/lib/i18n/languages";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { RequestType } from "@/lib/request-types/schema";
import { formatKst } from "@/lib/time";
import { decideChannel } from "@/lib/requests/channel";
import { requestFacts } from "@/lib/requests/facts";
import { ApprovalCard } from "./ApprovalCard";
import { CallPanel } from "./CallPanel";
import { ExecutionBadge, LEVEL_KEY } from "./ExecutionBadge";
import { EnvelopeIcon } from "./icons";
import { ReplyPanel } from "./ReplyPanel";
import { RouteStrip } from "./RouteStrip";
import { SignTitle } from "./SignTitle";

const FINISHED = new Set(["done", "declined"]);

// 시각에 따라 바뀌는 판단(전화 칸)은 요청 시점 기준이다
export function RequestList({
  requests,
  types,
  stays,
  latestReplies,
  m,
  language,
  realMail = false,
}: {
  requests: Request[];
  types: RequestType[];
  stays: Stay[];
  latestReplies: Record<string, Reply | null>;
  m: Messages;
  realMail?: boolean;
  language: string;
}) {
  const now = new Date();
  return (
    <section className="panel" aria-labelledby="requests-heading">
      <SignTitle id="requests-heading" ko="요청" text={m.requests.title} icon={<EnvelopeIcon />} />
      {requests.length === 0 ? (
        <p className="empty-note">{m.requests.empty}</p>
      ) : (
        <ul className="request-list">
          {/* 진행 중인 요청을 끝난 요청보다 위에 둔다. 승인해도 자리가 바뀌지 않아 열차가 움직이는 모습이 보던 자리에서 보인다 */}
          {[...requests]
            .sort((a, b) => Number(FINISHED.has(a.status)) - Number(FINISHED.has(b.status)))
            .map((request) => {
            const type = types.find((candidate) => candidate.id === request.type_id);
            const stay = stays.find((candidate) => candidate.id === request.target_id);
            const line = type ? LEVEL_KEY[type.execution_level] : "info";
            // 이메일이 없어 전화로 가는 요청, 또는 메일을 보내도 답을 기다릴 시간이 모자란 요청에는 전화 칸을 띄운다
            const waiting = request.status === "pending_approval" || request.status === "awaiting_reply";
            const callReason =
              request.channel === "phone" && request.status === "draft"
                ? "noEmail"
                : waiting && type && (request.slots.place_phone ?? stay?.phone) && decideChannel(type, stay, request.slots, now).reason === "deadline_soon"
                  ? "soon"
                  : null;
            return (
              <li key={request.id} className={`request ${request.status === "pending_approval" ? "is-focus" : ""}`}>
                <div className="request-head">
                  {/* 상태가 바뀌면(승인·발송·회신) 배지가 다시 찍힌다 */}
                  {type && <ExecutionBadge key={request.status} level={type.execution_level} m={m} />}
                  <h3 className="request-title">
                    <span lang="ko">{type?.label.ko ?? request.type_id}</span>
                    {type && type.label[language] && language !== "ko" && (
                      <span className="request-title-text">{type.label[language]}</span>
                    )}
                  </h3>
                  {(stay || request.slots.place_name) && (
                    <span className="request-target">
                      {stay?.name ?? [request.slots.place_name, request.slots.place_branch].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {request.round > 1 && <span className="request-round">{fmt(m.requests.round, { n: request.round })}</span>}
                </div>
                <RouteStrip status={request.status} line={line} m={m} />
                {callReason && (
                  <CallPanel
                    requestId={request.id}
                    phone={request.slots.place_phone ?? stay?.phone}
                    where={stay?.name ?? request.slots.place_name ?? m.agent.theBusiness}
                    reason={callReason}
                    m={m.requests.call}
                  />
                )}
                {request.status === "pending_approval" && request.draft && (
                  <ApprovalCard
                    requestId={request.id}
                    draft={request.draft}
                    to={request.slots.place_email ?? stay?.email}
                    facts={requestFacts(request.slots, language, m.approval)}
                    m={m.approval}
                    language={getLanguage(language)}
                    realMail={realMail}
                  />
                )}
                {(request.status === "awaiting_reply" || latestReplies[request.id]) && (
                  <ReplyPanel requestId={request.id} status={request.status} reply={latestReplies[request.id] ?? null} m={m} />
                )}
                {request.sent && (
                  <p className="request-sent">
                    {fmt(m.sent.sentTo, { to: request.sent.to, time: formatKst(request.sent.at, language) })}
                    {request.sent.mode === "mock" && <span className="demo-tag">{m.sent.demo}</span>}
                    {request.sent.mode === "real" && <span className="demo-tag">{m.sent.accepted}</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
