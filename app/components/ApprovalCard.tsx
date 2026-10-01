"use client";

import { useState, useTransition } from "react";
import { approveAndSendAction, requestChangesAction } from "@/app/actions";
import type { Draft } from "@/lib/board/types";
import { fmt, type Messages } from "@/lib/i18n/messages";

// 역명판처럼 한국어 원문을 크게, 이용자 언어 역번역을 그 아래에 둔다.
// 되돌릴 수 없는 '승인하고 보내기'는 홀로 두고, '수정 요청'은 반대편 끝에 둔다.
export function ApprovalCard({
  requestId,
  draft,
  to,
  m,
}: {
  requestId: string;
  draft: Draft;
  to?: string;
  m: Messages["approval"];
}) {
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
    <section className="station-sign" aria-label={m.korean}>
      <header className="station-sign-bar">
        <span>{m.korean}</span>
        {to && <span className="station-sign-to">{fmt(m.to, { to })}</span>}
      </header>
      <div className="station-sign-ko" lang="ko">
        <p className="station-sign-subject">{draft.subject_ko}</p>
        <p className="station-sign-body">{draft.body_ko}</p>
      </div>
      <div className="station-sign-translation">
        <p className="station-sign-label">{m.translation}</p>
        <p className="station-sign-body">{draft.back_translation}</p>
      </div>

      {editing ? (
        <div className="station-sign-actions station-sign-edit">
          <input
            className="field"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={m.whatChange}
            aria-label={m.whatChange}
            autoFocus
          />
          <button type="button" className="button" onClick={askForChanges} disabled={pending}>
            {pending ? m.working : m.redraft}
          </button>
          <button type="button" className="button-quiet" onClick={() => setEditing(false)} disabled={pending}>
            {m.cancel}
          </button>
        </div>
      ) : (
        <div className="station-sign-actions">
          <div className="station-sign-aside">
            <button type="button" className="button-quiet" onClick={() => setEditing(true)} disabled={pending}>
              {m.requestChanges}
            </button>
            <p className="approve-note">{m.notSent}</p>
          </div>
          <button type="button" className="button-approve" onClick={approve} disabled={pending}>
            {pending ? m.working : m.approve}
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
