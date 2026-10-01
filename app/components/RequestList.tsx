import type { Request } from "@/lib/board/types";
import { STATUS_LABELS } from "@/lib/requests/state";
import type { RequestType } from "@/lib/request-types/schema";
import { ExecutionBadge } from "./ExecutionBadge";

export function RequestList({ requests, types }: { requests: Request[]; types: RequestType[] }) {
  return (
    <section className="panel" aria-labelledby="requests-heading">
      <h2 id="requests-heading">Requests</h2>
      {requests.length === 0 ? (
        <p className="muted card">No requests yet. Ask Majung in the chat, e.g. “Tell my hotel I arrive at 1:30 AM.”</p>
      ) : (
        <ul className="list card">
          {requests.map((request) => {
            const type = types.find((candidate) => candidate.id === request.type_id);
            return (
              <li key={request.id} className="request-row">
                {type && <ExecutionBadge level={type.execution_level} />}
                <strong>{type?.label.en ?? request.type_id}</strong>
                <span className={`status status-${request.status}`}>{STATUS_LABELS[request.status]}</span>
                {request.round > 1 && <span className="muted">round {request.round}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
