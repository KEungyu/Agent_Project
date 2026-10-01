import type { Request, Stay } from "@/lib/board/types";
import { STATUS_LABELS } from "@/lib/requests/state";
import type { RequestType } from "@/lib/request-types/schema";
import { formatKst } from "@/lib/time";
import { ApprovalCard } from "./ApprovalCard";
import { ExecutionBadge } from "./ExecutionBadge";

export function RequestList({ requests, types, stays }: { requests: Request[]; types: RequestType[]; stays: Stay[] }) {
  return (
    <section className="panel" aria-labelledby="requests-heading">
      <h2 id="requests-heading">Requests</h2>
      {requests.length === 0 ? (
        <p className="muted card">No requests yet. Ask Majung in the chat, e.g. “Tell my hotel I arrive at 1:30 AM.”</p>
      ) : (
        <ul className="list">
          {requests.map((request) => {
            const type = types.find((candidate) => candidate.id === request.type_id);
            const stay = stays.find((candidate) => candidate.id === request.target_id);
            return (
              <li key={request.id} className="card request">
                <div className="request-row">
                  {type && <ExecutionBadge level={type.execution_level} />}
                  <strong>{type?.label.en ?? request.type_id}</strong>
                  {stay && <span className="muted">· {stay.name}</span>}
                  <span className={`status status-${request.status}`}>{STATUS_LABELS[request.status]}</span>
                  {request.round > 1 && <span className="muted">round {request.round}</span>}
                </div>
                {request.status === "pending_approval" && request.draft && (
                  <ApprovalCard requestId={request.id} draft={request.draft} to={stay?.email} />
                )}
                {request.sent && (
                  <p className="muted">
                    Sent {request.sent.mode === "mock" ? "(demo mode — not really delivered)" : ""} to {request.sent.to} at{" "}
                    {formatKst(request.sent.at)}
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
