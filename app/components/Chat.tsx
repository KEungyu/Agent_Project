"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendChat } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";
import { SignTitle } from "./SignTitle";

export type ChatLine = {
  role: "user" | "assistant" | "error" | "safety";
  text: string;
  tools?: { name: string; ok: boolean }[];
  safety?: "emergency" | "out_of_scope";
};

// 안내 데스크: 마중에게 묻는 창. 도구 호출은 지하철 출구 번호판처럼 노란 표로 보여준다.
export function Chat({ initialLines, m, safety }: { initialLines: ChatLine[]; m: Messages["chat"]; safety: Messages["safety"] }) {
  const [lines, setLines] = useState<ChatLine[]>(initialLines);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines.length, pending]);

  function submit(form: FormData) {
    send(String(form.get("message") ?? ""));
  }

  function send(raw: string) {
    const message = raw.trim();
    if (!message || pending) return;
    setLines((current) => [...current, { role: "user", text: message }]);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(async () => {
      const result = await sendChat(message);
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
      <SignTitle id="chat-heading" ko="마중에게 묻기" text={m.title} />
      <ol ref={logRef} className="desk-log" aria-live="polite">
        {lines.length === 0 && (
          <li className="desk-empty">
            <p>{m.empty}</p>
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
          <li key={i} className={`say say-${line.role}`}>
            {line.role === "assistant" && (
              <span className="say-roundel" aria-hidden="true" lang="ko">
                마
              </span>
            )}
            <div className="say-body">
              {line.tools && line.tools.length > 0 && (
                <div className="exit-tiles">
                  {line.tools.map((tool, j) => (
                    <span key={j} className={tool.ok ? "exit-tile" : "exit-tile is-error"}>
                      {tool.name}
                    </span>
                  ))}
                </div>
              )}
              <p>{line.text}</p>
            </div>
          </li>
          ),
        )}
        {pending && (
          <li className="say say-assistant say-pending">
            <span className="say-roundel" aria-hidden="true" lang="ko">
              마
            </span>
            <div className="say-body">
              <span className="working-line" aria-hidden="true" />
              <p className="muted">{m.working}</p>
            </div>
          </li>
        )}
      </ol>
      <form action={submit} className="desk-input">
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
