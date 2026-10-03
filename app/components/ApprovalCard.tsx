"use client";

import { useState, useTransition } from "react";
import { approveAndSendAction, requestChangesAction, retranslateAction } from "@/app/actions";
import type { Draft } from "@/lib/board/types";
import { getLanguage, type Language } from "@/lib/i18n/languages";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { Fact } from "@/lib/requests/facts";
import { CopyButton } from "./CopyButton";
import { EnvelopeIcon } from "./icons";
import { showToast } from "./Toaster";

// 역명판처럼 한국어 원문을 크게, 이용자 언어 역번역을 그 아래에 둔다.
// 되돌릴 수 없는 '승인하고 보내기'는 홀로 두고, '수정 요청'은 반대편 끝에 둔다.
export function ApprovalCard({
  requestId,
  draft,
  to,
  facts,
  m,
  language,
}: {
  requestId: string;
  draft: Draft;
  to?: string;
  facts: Fact[];
  m: Messages["approval"];
  language: Language;
}) {
  // 역번역이 지금 화면 언어와 다르면 어떤 언어인지 밝히고 다시 번역할 수 있게 한다
  const translatedIn = getLanguage(draft.back_translation_language ?? "en");
  const stale = translatedIn.code !== language.code;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [departing, setDeparting] = useState(false);

  // 스크린도어가 닫히는 동안 실제 발송이 함께 진행된다 (연출 때문에 발송을 늦추지 않는다)
  const approve = () => {
    setDeparting(true);
    startTransition(async () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [result] = await Promise.all([
        approveAndSendAction(requestId),
        new Promise((resolve) => setTimeout(resolve, reduced ? 0 : 520)),
      ]);
      if (result.ok) {
        showToast(fmt(m.sentToast, { to: to ?? "" }));
      } else {
        setDeparting(false);
        setError(result.error);
      }
    });
  };

  const retranslate = () =>
    startTransition(async () => {
      const result = await retranslateAction(requestId);
      setError(result.ok ? undefined : result.error);
    });

  const askForChanges = () =>
    startTransition(async () => {
      const result = await requestChangesAction(requestId, note);
      setError(result.ok ? undefined : result.error);
      if (result.ok) setEditing(false);
    });

  return (
    <section className={`station-sign ${departing ? "is-departing" : ""}`} aria-label={m.korean} aria-busy={departing}>
      <span className="door door-left" aria-hidden="true" />
      <span className="door door-right" aria-hidden="true">
        <span className="door-label">{m.sending}</span>
      </span>
      <header className="station-sign-bar">
        <span>{m.korean}</span>
        {to && <span className="station-sign-to">{fmt(m.to, { to })}</span>}
      </header>
      {/* 승인하기 전에 확인할 핵심 사실: 초안과 같은 값에서 만든 날짜·시각(연도·24시간·KST)과 받는 곳 */}
      {(facts.length > 0 || to) && (
        <div className="approval-facts">
          <p className="station-sign-label">{m.factsTitle}</p>
          <dl>
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd className="tabular">{fact.value}</dd>
              </div>
            ))}
            {to && (
              <div>
                <dt>{m.factTo}</dt>
                <dd>{to}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
      <div className="station-sign-ko" lang="ko">
        <p className="station-sign-subject">{draft.subject_ko}</p>
        <p className="station-sign-body">{draft.body_ko}</p>
        {/* 마중이가 쓴 메일을 바로 복사하거나, 내 메일 앱에서 직접 보낼 수 있게 한다 */}
        <div className="copy-row" lang={language.code}>
          <CopyButton text={`${draft.subject_ko}\n\n${draft.body_ko}`} label={m.copyKorean} copied={m.copied} />
          {to && (
            <a
              className="copy-button"
              href={`mailto:${to}?subject=${encodeURIComponent(draft.subject_ko)}&body=${encodeURIComponent(draft.body_ko)}`}
            >
              <span className="copy-icon">
                <EnvelopeIcon />
              </span>
              {m.openMail}
            </a>
          )}
        </div>
        {/* 복사·메일 앱은 이용자가 직접 보내는 실제 메일 경로라서, 앱의 시연용 발송과 구분해 알려 준다 */}
        <p className="mail-note" lang={language.code}>
          {m.mailNote}
        </p>
      </div>
      <div className="station-sign-translation">
        <div className="station-sign-label-row">
          <p className="station-sign-label">
            {m.translation}
            {stale && <span className="translated-in"> · {fmt(m.translatedInto, { language: translatedIn.nativeName })}</span>}
          </p>
          {stale && (
            <button type="button" className="button-quiet button-small" onClick={retranslate} disabled={pending}>
              {pending ? m.working : fmt(m.retranslate, { language: language.nativeName })}
            </button>
          )}
        </div>
        <p className="station-sign-body">{draft.back_translation}</p>
        <div className="copy-row">
          <CopyButton text={draft.back_translation} label={m.copyTranslation} copied={m.copied} />
        </div>
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
            <p className="approve-demo">{m.demoNote}</p>
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
