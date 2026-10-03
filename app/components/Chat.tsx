"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendChat } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";
import { EnvelopeIcon } from "./icons";
import { SignTitle } from "./SignTitle";

export type ChatLine = {
  role: "user" | "assistant" | "error" | "safety";
  text: string;
  tools?: { name: string; ok: boolean }[];
  safety?: "emergency" | "out_of_scope";
};

// 마중이가 쓴 메일 초안(승인 대기 요청)으로 화면을 옮기고 잠깐 반짝이게 한다
function focusDraft() {
  // 요청은 만든 순서대로 놓이므로 승인 대기 중 마지막 카드가 방금 쓴 초안이다
  const target = [...document.querySelectorAll<HTMLElement>(".request.is-focus")].at(-1) ?? document.getElementById("requests-heading");
  if (!target) return;
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  target.classList.remove("is-flash");
  void target.offsetWidth;
  target.classList.add("is-flash");
}

const draftedIn = (line: ChatLine) => line.tools?.some((tool) => tool.name === "draft_request" && tool.ok);

// 안내 데스크: 마중에게 묻는 창.
export function Chat({ initialLines, m, safety }: { initialLines: ChatLine[]; m: Messages["chat"]; safety: Messages["safety"] }) {
  const [lines, setLines] = useState<ChatLine[]>(initialLines);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  // 처음 그린 대화는 그대로 두고, 이번에 새로 온 답변만 마스코트가 "방방" 튀며 말한다
  const initialCount = useRef(initialLines.length);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines.length, pending]);

  // form action은 React가 전환(transition)으로 감싸 보낸 메시지가 응답이 올 때까지 안 보인다. onSubmit으로 바로 보이게 한다
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(String(new FormData(event.currentTarget).get("message") ?? ""));
  }

  function send(raw: string) {
    const message = raw.trim();
    if (!message || pending) return;
    setLines((current) => [...current, { role: "user", text: message }]);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(async () => {
      const result = await sendChat(message);
      // 초안이 생기면 새로 그려진 요청 카드로 화면을 옮긴다
      if (result.ok && "tools" in result && result.tools.some((tool) => tool.name === "draft_request" && tool.ok)) {
        setTimeout(focusDraft, 450);
      }
      setLines((current) => [
        ...current,
        !result.ok
          ? { role: "error", text: result.error }
          : "safety" in result
            ? { role: "safety", text: "", safety: result.safety }
            : { role: "assistant", text: result.reply, tools: result.tools },
      ]);
    });
  }

  return (
    <section id="chat" className="desk" aria-labelledby="chat-heading">
      <SignTitle id="chat-heading" ko="마중이에게 묻기" text={m.title} />
      <ol ref={logRef} className="desk-log" aria-live="polite">
        {lines.length === 0 && (
          <li className="desk-empty">
            <div className="desk-greet">
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 마스코트 이미지 */}
              <img className="greet-mascot" src="/mascot/majung.png" width={140} height={135} alt="Majungi" />
              <div className="greet-bubble">
                <p className="greet-ko" lang="ko">
                  안녕하세요, 마중이예요!
                </p>
                {m.hello !== "안녕하세요, 마중이예요!" && <p className="greet-hello">{m.hello}</p>}
                <p className="greet-note">{m.empty}</p>
              </div>
            </div>
            <div className="desk-examples">
              {m.examples.map((example) => (
                <button key={example} type="button" className="desk-example" onClick={() => send(example)} disabled={pending}>
                  {example}
                </button>
              ))}
            </div>
          </li>
        )}
        {lines.map((line, i) =>
          line.role === "safety" && line.safety ? (
            <li key={i} className="say-safety">
              <SafetyCard kind={line.safety} m={safety} />
            </li>
          ) : (
          <li key={i} className={`say say-${line.role} ${i >= initialCount.current ? "is-new" : ""}`}>
            {(line.role === "assistant" || line.role === "error") && <MascotAvatar />}
            <div className="say-body">
              {/* 도구 이름(board_get 등)은 내부 동작이라 화면에 보이지 않는다. 서버 로그([agent])에서 확인한다 */}
              <p>{line.text}</p>
              {draftedIn(line) && (
                <button type="button" className="say-draft" onClick={focusDraft}>
                  <EnvelopeIcon />
                  {m.viewDraft}
                </button>
              )}
            </div>
          </li>
          ),
        )}
        {pending && (
          <li className="say-working">
            {/* 마중이가 무대 위를 왔다 갔다 뛰며 땀을 흘린다 */}
            <div className="working-stage" aria-hidden="true">
              <span className="working-runner">
                <span className="working-body">
                  <img src="/mascot/majung.png" alt="" width={56} height={54} />
                  <span className="sweat sweat-1" />
                  <span className="sweat sweat-2" />
                  <span className="sweat sweat-3" />
                </span>
                <span className="dust dust-1" />
                <span className="dust dust-2" />
              </span>
            </div>
            <p className="working-text" role="status">
              {m.working}
              <span className="working-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          </li>
        )}
      </ol>
      <form onSubmit={submit} className="desk-input">
        <input ref={inputRef} className="field" name="message" placeholder={m.placeholder} aria-label={m.placeholder} autoComplete="off" />
        <button type="submit" className="button" disabled={pending}>
          {m.send}
        </button>
      </form>
    </section>
  );
}

// 긴급이면 112·119·1330, 행정 질문이면 1345. 번호는 휴대폰에서 바로 걸 수 있게 tel: 링크로 둔다.
function SafetyCard({ kind, m }: { kind: "emergency" | "out_of_scope"; m: Messages["safety"] }) {
  const numbers =
    kind === "emergency"
      ? [
          { tel: "119", label: m.n119 },
          { tel: "112", label: m.n112 },
          { tel: "1330", label: m.n1330 },
        ]
      : [{ tel: "1345", label: m.n1345 }];
  return (
    <div className={`safety-card safety-${kind}`} role={kind === "emergency" ? "alert" : undefined}>
      <p className="safety-title">{kind === "emergency" ? m.emergencyTitle : m.outTitle}</p>
      <p className="safety-note">{kind === "emergency" ? m.emergencyNote : m.outNote}</p>
      <ul className="safety-numbers">
        {numbers.map((number) => (
          <li key={number.tel}>
            <a href={`tel:${number.tel}`} className="safety-number">
              <span className="safety-digits">{number.tel}</span>
              <span>{number.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 마스코트 얼굴. 새 답변이면 몸이 통통 튀고(방방) 머리 옆에 반짝이가 터진다.
function MascotAvatar() {
  return (
    <span className="say-avatar-wrap" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 마스코트 이미지 */}
      <img className="say-avatar" src="/mascot/majung-head.png" width={40} height={40} alt="" />
      <svg className="say-sparks" viewBox="0 0 24 24">
        <path d="M5 9 2 6M12 5V1M19 9l3-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
