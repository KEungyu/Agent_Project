import type { Request, Stay } from "@/lib/board/types";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { RequestType } from "@/lib/request-types/schema";
import { formatKst } from "@/lib/time";
import { ApprovalCard } from "./ApprovalCard";
import { ExecutionBadge, LEVEL_KEY } from "./ExecutionBadge";
import { RouteStrip } from "./RouteStrip";
import { SignTitle } from "./SignTitle";

export function RequestList({
  requests,
  types,
  stays,
  m,
  language,
}: {
  requests: Request[];
  types: RequestType[];
  stays: Stay[];
  m: Messages;
  language: string;
}) {
  return (
    <section className="panel" aria-labelledby="requests-heading">
      <SignTitle id="requests-heading" ko="요청" text={m.requests.title} />
      {requests.length === 0 ? (
        <p className="empty-note">{m.requests.empty}</p>
      ) : (
        <ul className="request-list">
          {/* 승인을 기다리는 요청을 맨 위에 둔다 */}
          {[...requests]
            .sort((a, b) => Number(b.status === "pending_approval") - Number(a.status === "pending_approval"))
            .map((request) => {
            const type = types.find((candidate) => candidate.id === request.type_id);
            const stay = stays.find((candidate) => candidate.id === request.target_id);
            const line = type ? LEVEL_KEY[type.execution_level] : "info";
            return (
              <li key={request.id} className={`request ${request.status === "pending_approval" ? "is-focus" : ""}`}>
                <div className="request-head">
                  {type && <ExecutionBadge level={type.execution_level} m={m} />}
                  <h3 className="request-title">
                    <span lang="ko">{type?.label.ko ?? request.type_id}</span>
                    {type && type.label[language] && language !== "ko" && (
                      <span className="request-title-text">{type.label[language]}</span>
                    )}
                  </h3>
                  {stay && <span className="request-target">{stay.name}</span>}
                  {request.round > 1 && <span className="request-round">{fmt(m.requests.round, { n: request.round })}</span>}
                </div>
                <RouteStrip status={request.status} line={line} m={m} />
                {request.status === "pending_approval" && request.draft && (
                  <ApprovalCard requestId={request.id} draft={request.draft} to={stay?.email} m={m.approval} />
                )}
                {request.sent && (
                  <p className="request-sent">
                    {fmt(m.sent.sentTo, { to: request.sent.to, time: formatKst(request.sent.at, language) })}
                    {request.sent.mode === "mock" && <span className="demo-tag">{m.sent.demo}</span>}
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
