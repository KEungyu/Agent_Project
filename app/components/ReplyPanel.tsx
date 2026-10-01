"use client";

import { useState, useTransition } from "react";
import { confirmReplyAction, followUpAction, submitReplyAction } from "@/app/actions";
import type { Reply, ReplyClass, RequestStatus } from "@/lib/board/types";
import type { Messages } from "@/lib/i18n/messages";
import { followUpsFor, type FollowUpKind } from "@/lib/requests/followup-kinds";
import { SAMPLE_REPLIES } from "@/lib/requests/sample-replies";

const CLASSES: ReplyClass[] = ["done", "conditional", "declined", "info_requested"];

type Props = { requestId: string; status: RequestStatus; reply: Reply | null; m: Messages };

// 회신 대기: 회신 입력 → 해석 결과, 또는 해석할 수 없을 때 이용자가 직접 분류한다.
export function ReplyPanel({ requestId, status, reply, m }: Props) {
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const r = m.reply;

  const interpretation = reply?.interpretation;
  const needsChoice = status === "awaiting_reply" && reply && (!interpretation || interpretation.needs_user_check);

  if (status === "awaiting_reply" && !needsChoice) {
    return (
      <form
        className="reply-box"
        action={() =>
          startTransition(async () => {
            const result = await submitReplyAction(requestId, text);
            setError(result.ok ? undefined : result.error);
            if (result.ok) setText("");
          })
        }
      >
        <label className="label" htmlFor={`reply-${requestId}`}>
          {r.paste}
        </label>
        <textarea
          id={`reply-${requestId}`}
          className="field reply-textarea"
          lang="ko"
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={r.placeholder}
        />
        <div className="reply-actions">
          <select
            className="field reply-sample"
            aria-label={r.sample}
            value=""
            onChange={(event) => setText(SAMPLE_REPLIES.find((sample) => sample.id === event.target.value)?.raw_ko ?? "")}
          >
            <option value="">{r.sample}</option>
            {SAMPLE_REPLIES.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {m.status[sample.id]}
              </option>
            ))}
          </select>
          <button type="submit" className="button" disabled={pending || !text.trim()}>
            {pending ? m.approval.working : r.submit}
          </button>
        </div>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (!reply) return null;

  return (
    <div className="reply-result">
      <details className="reply-original" open={Boolean(needsChoice)}>
        <summary>{r.original}</summary>
        <p lang="ko">{reply.raw_ko}</p>
      </details>

      {interpretation?.summary && (
        <div className="reply-meaning">
          <p className="station-sign-label">{r.meaning}</p>
          <p>{interpretation.summary}</p>
        </div>
      )}
      {interpretation && interpretation.conditions.length > 0 && <ReplyList title={r.conditions} items={interpretation.conditions} />}
      {interpretation && interpretation.requested_info.length > 0 && (
        <ReplyList title={r.requested} items={interpretation.requested_info} />
      )}

      {needsChoice ? (
        <div className="reply-choice">
          <p>{interpretation ? r.check : r.manual}</p>
          <div className="reply-choice-grid">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                className={`reply-class reply-class-${cls}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await confirmReplyAction(reply.id, cls);
                    setError(result.ok ? undefined : result.error);
                  })
                }
              >
                {m.status[cls]}
              </button>
            ))}
          </div>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          {interpretation?.confirmed_by_user && <p className="reply-confirmed">{r.confirmed}</p>}
          <FollowUps requestId={requestId} kinds={followUpsFor(status)} m={m} />
        </>
      )}
    </div>
  );
}

const FOLLOW_UP_LABEL: Record<FollowUpKind, keyof Messages["followup"]> = {
  accept: "accept",
  reply: "reply",
  provide_info: "provideInfo",
  phone: "phone",
};

// 회신 이후 다음 행동. 결과는 채팅과 요청 노선에 나타난다.
function FollowUps({ requestId, kinds, m }: { requestId: string; kinds: FollowUpKind[]; m: Messages }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  if (kinds.length === 0) return null;
  return (
    <div className="followups">
      {kinds.map((kind, i) => (
        <button
          key={kind}
          type="button"
          className={i === 0 ? "button" : "button-quiet"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (kind !== "accept") document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
              const result = await followUpAction(requestId, kind);
              setError(result.ok ? undefined : result.error);
            })
          }
        >
          {pending ? m.approval.working : m.followup[FOLLOW_UP_LABEL[kind]]}
        </button>
      ))}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReplyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="reply-list">
      <p className="station-sign-label">{title}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
