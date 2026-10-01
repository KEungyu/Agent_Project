"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendChat } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";
import { SignTitle } from "./SignTitle";

export type ChatLine = { role: "user" | "assistant" | "error"; text: string; tools?: { name: string; ok: boolean }[] };

// 안내 데스크: 마중에게 묻는 창. 도구 호출은 지하철 출구 번호판처럼 노란 표로 보여준다.
export function Chat({ initialLines, m }: { initialLines: ChatLine[]; m: Messages["chat"] }) {
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
        result.ok ? { role: "assistant", text: result.reply, tools: result.tools } : { role: "error", text: result.error },
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
        {lines.map((line, i) => (
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
        ))}
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
