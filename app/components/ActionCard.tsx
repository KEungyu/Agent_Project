"use client";

import { EXTERNAL_PROVIDERS, safeExternalUrl, type ExternalAction } from "@/lib/external/links";
import type { Messages } from "@/lib/i18n/messages";
import { CopyButton } from "./CopyButton";
import { ExternalIcon } from "./icons";

// 채팅 답에 붙는 외부 예약 화면 연결 카드. 연결은 예약이 아니다: 상태는 언제나 "예약 사이트 연결"이다.
// opened: 이번 화면에서 새 탭을 열었는지 (true 열림 · false 브라우저가 막음 · undefined 시도 안 함)
// 새 탭 열기 규칙은 lib/external/open.ts에 있다

export function ActionCard({ action, opened, m }: { action: ExternalAction; opened?: boolean; m: Messages["actions"] }) {
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
    </div>
  );
}
