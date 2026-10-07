"use client";

import { useState, useTransition } from "react";
import { recordExternalResultAction } from "@/app/actions";
import { EXTERNAL_PROVIDERS, hasExternalBookingDetails, safeExternalUrl, type ExternalAction } from "@/lib/external/links";
import type { ExternalResult } from "@/lib/external/results";
import type { Messages } from "@/lib/i18n/messages";
import { CopyButton } from "./CopyButton";
import { ExternalIcon } from "./icons";

// 채팅 답에 붙는 외부 예약 화면 연결 카드. 연결은 예약이 아니다: 상태는 언제나 "예약 사이트 연결"이다.
// opened: 이번 화면에서 새 탭을 열었는지 (true 열림 · false 브라우저가 막음 · undefined 시도 안 함)
// 새 탭 열기 규칙은 lib/external/open.ts에 있다

// 사이트에서 이용자가 직접 한 결과를 고르는 버튼. 대기(웨이팅)는 Catchtable에만 있다
const RESULT_CHOICES: Record<ExternalAction["provider"], ExternalResult[]> = {
  booking: ["booked", "not_yet"],
  catchtable: ["booked", "waitlisted", "requested", "not_yet"],
};
const RESULT_LABEL = { booked: "resultBooked", waitlisted: "resultWaitlisted", requested: "resultRequested", not_yet: "resultNotYet" } as const;

export function ActionCard({
  action,
  opened,
  recorded,
  m,
}: {
  action: ExternalAction;
  opened?: boolean;
  recorded?: ExternalResult;
  m: Messages["actions"];
}) {
  const [result, setResult] = useState<ExternalResult | undefined>(recorded);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const complete = hasExternalBookingDetails(action);
  const url = safeExternalUrl(action.url, action.provider);
  if (!url) return null;
  const provider = EXTERNAL_PROVIDERS[action.provider];
  const isBooking = action.provider === "booking";
  const copyText = action.summary.map((row) => `${row.label}: ${row.value}`).join("\n");
  return (
    <div className={`action-card is-${action.provider}`}>
      <p className="action-head">
        <span className="action-provider">{provider.name}</span>
        <span className="action-status">{m.siteLink}</span>
      </p>
      {action.summary.length > 0 && (
        <>
          <p className="action-sub">{m.detailsTitle}</p>
          <dl className="action-summary">
            {action.summary.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <div className="action-buttons">
        <a className="button action-open" href={url} target="_blank" rel="noopener noreferrer">
          {isBooking ? m.openBooking : m.openCatchtable}
          <ExternalIcon />
        </a>
        {action.summary.length > 0 && <CopyButton text={copyText} label={m.copy} copied={m.copied} />}
      </div>
      {opened === true && <p className="action-opened">{m.opened}</p>}
      {opened === false && (
        <p className="action-blocked" role="status">
          {m.blocked}
        </p>
      )}
      <p className="action-note">{isBooking ? m.noteBooking : m.noteCatchtable}</p>
      {/* 돌아왔다는 것만으로는 아무것도 기록하지 않는다. 이용자가 고른 결과만 "이용자 기록"으로 남긴다 */}
      <div className="action-result" role="group" aria-label={m.resultTitle}>
        <p className="action-sub">{m.resultTitle}</p>
        <p className="action-note">{m.resultDetails}</p>
        {complete && <label className="ag-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{m.resultConfirm}</label>}
        <div className="action-result-choices">
          {RESULT_CHOICES[action.provider].map((choice) => (
            <button
              key={choice}
              type="button"
              className="chip"
              aria-pressed={(result ?? recorded) === choice}
              disabled={pending || (choice !== "not_yet" && (!complete || !confirmed))}
              onClick={() =>
                startTransition(async () => {
                  const saved = await recordExternalResultAction(action, choice, confirmed);
                  setFailed(!saved.ok);
                  if (saved.ok) setResult(choice);
                })
              }
            >
              {m[RESULT_LABEL[choice]]}
            </button>
          ))}
        </div>
        {failed && <p className="action-note" role="alert">{m.resultDetails}</p>}
        {(result ?? recorded) && <p className="action-note">{m.resultNote}</p>}
      </div>
    </div>
  );
}
