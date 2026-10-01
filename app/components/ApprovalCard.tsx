"use client";

import { useState, useTransition } from "react";
import { approveAndSendAction, requestChangesAction } from "@/app/actions";
import type { Draft } from "@/lib/board/types";

// 한국어 원문과 이용자 언어 역번역을 나란히 보여주고, 승인해야만 발송한다
export function ApprovalCard({ requestId, draft, to }: { requestId: string; draft: Draft; to?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");

  const approve = () =>
    startTransition(async () => {
      const result = await approveAndSendAction(requestId);
      setError(result.ok ? undefined : result.error);
    });

  const askForChanges = () =>
    startTransition(async () => {
      const result = await requestChangesAction(requestId, note);
      setError(result.ok ? undefined : result.error);
      if (result.ok) setEditing(false);
    });

  return (
    <div className="approval">
      <div className="approval-columns">
        <div>
          <p className="approval-label">Korean (what will be sent{to ? ` to ${to}` : ""})</p>
          <p className="approval-subject" lang="ko">
            {draft.subject_ko}
          </p>
          <p className="approval-body" lang="ko">
            {draft.body_ko}
          </p>
        </div>
        <div>
          <p className="approval-label">Translation back into your language</p>
          <p className="approval-body">{draft.back_translation}</p>
        </div>
      </div>

      {editing ? (
        <div className="approval-actions">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What should change?"
            aria-label="Requested changes"
          />
          <button type="button" onClick={askForChanges} disabled={pending}>
            Redraft
          </button>
          <button type="button" className="secondary" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="approval-actions">
          <button type="button" onClick={approve} disabled={pending}>
            {pending ? "Working…" : "Approve and send"}
          </button>
          <button type="button" className="secondary" onClick={() => setEditing(true)} disabled={pending}>
            Request changes
          </button>
        </div>
      )}
      {error && (
        <p className="approval-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
