"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { callScriptAction } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { PhoneScript } from "@/lib/requests/channel";
import { PhoneIcon } from "./icons";

// 요청 카드 안의 전화 칸: 이메일이 없으면 처음부터 대본을 펼치고, 시간이 촉박하면 "전화가 더 빨라요"와 함께 버튼으로 연다.
// 앱은 전화를 걸지 않는다. tel: 링크로 이용자 휴대폰의 전화 앱을 열 뿐이다.
export function CallPanel({
  requestId,
  phone,
  where,
  reason,
  m,
}: {
  requestId: string;
  phone?: string;
  where: string;
  reason: "soon" | "noEmail";
  m: Messages["requests"]["call"];
}) {
  const [script, setScript] = useState<PhoneScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await callScriptAction(requestId);
      if (result.ok) setScript(result.script);
      else setError(result.error);
    });
  }, [requestId]);

  // 이메일이 없어 전화가 유일한 길이면 대본을 바로 만든다
  useEffect(() => {
    if (reason === "noEmail") load();
  }, [reason, load]);

  return (
    <section className={`call-panel is-${reason}`} aria-label={fmt(m.title, { where })}>
      <header className="call-head">
        <span className="call-ring" aria-hidden="true">
          <PhoneIcon />
        </span>
        <div className="call-head-text">
          <p className="call-title">{fmt(m.title, { where })}</p>
          <p className="call-note">{reason === "soon" ? m.soon : m.noEmail}</p>
        </div>
        {phone && (
          <a className="button call-now" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
            <PhoneIcon />
            {m.callNow}
          </a>
        )}
      </header>
      {!script && !pending && reason === "soon" && (
        <button type="button" className="button-quiet call-show" onClick={load}>
          {m.show}
        </button>
      )}
      {pending && (
        <p className="call-making" role="status">
          <span className="show-spinner is-dark" aria-hidden="true" />
          {m.making}
        </p>
      )}
      {error && (
        <p className="show-error" role="alert">
          {error}
        </p>
      )}
      {script && (
        <div className="call-script">
          <p className="call-label">{m.lines}</p>
          <ol className="call-lines">
            {script.lines.map((line, i) => (
              <li key={i} style={{ "--i": i } as React.CSSProperties}>
                <span className="call-ko" lang="ko">
                  {line.ko}
                </span>
                <span className="call-say">{line.pronunciation}</span>
                <span className="call-mean">{line.meaning}</span>
              </li>
            ))}
          </ol>
          <p className="call-label">{m.replies}</p>
          <ul className="call-replies">
            {script.expected_replies.map((reply, i) => (
              <li key={i}>
                <span lang="ko">{reply.ko}</span>
                <span>{reply.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
