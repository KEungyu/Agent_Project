"use client";

import { useRef, useState, useTransition } from "react";
import { sendChat } from "@/app/actions";

export type ChatLine = { role: "user" | "assistant" | "error"; text: string; tools?: { name: string; ok: boolean }[] };

export function Chat({ initialLines }: { initialLines: ChatLine[] }) {
  const [lines, setLines] = useState<ChatLine[]>(initialLines);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(form: FormData) {
    const message = String(form.get("message") ?? "").trim();
    if (!message || pending) return;
    setLines((current) => [...current, { role: "user", text: message }]);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(async () => {
      const result = await sendChat(message);
      setLines((current) => [
        ...current,
        result.ok
          ? { role: "assistant", text: result.reply, tools: result.tools }
          : { role: "error", text: result.error },
      ]);
    });
  }

  return (
    <section className="panel chat" aria-labelledby="chat-heading">
      <h2 id="chat-heading">Chat with Majung</h2>
      <ol className="chat-log" aria-live="polite">
        {lines.length === 0 && <li className="muted">Ask anything about your trip. Majung reads your board first.</li>}
        {lines.map((line, i) => (
          <li key={i} className={`bubble bubble-${line.role}`}>
            {line.tools && line.tools.length > 0 && (
              <div className="tool-log">
                {line.tools.map((tool, j) => (
                  <span key={j} className={tool.ok ? "tool tool-ok" : "tool tool-error"}>
                    {tool.name}
                  </span>
                ))}
              </div>
            )}
            {line.text}
          </li>
        ))}
        {pending && <li className="bubble bubble-assistant muted">Majung is working…</li>}
      </ol>
      <form action={submit} className="inline-form">
        <input ref={inputRef} name="message" placeholder="Type a message" aria-label="Message" autoComplete="off" />
        <button type="submit" disabled={pending}>
          Send
        </button>
      </form>
    </section>
  );
}
