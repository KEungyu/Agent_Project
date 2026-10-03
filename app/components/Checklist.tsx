"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ChecklistItem, ChecklistKey } from "@/lib/checklist";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CheckIcon, LinkIcon } from "./icons";
import { SignTitle } from "./SignTitle";

// 여행 체크리스트: 보드로 알 수 있는 항목은 자동으로 체크하고, 나머지는 직접 체크한다(이 브라우저에 저장).
// 체크하면 표시가 그려지며 톡 튀고, 다 채우면 색종이가 터진다.

const CONFETTI = ["#2f86e0", "#00a5de", "#ff9a5c", "#ffd36e", "#7a63c9", "#3fb98b"];

export function Checklist({ items, boardId, m }: { items: ChecklistItem[]; boardId: string; m: Messages["checklist"] }) {
  const storageKey = `majungi-checklist-${boardId}`;
  const [manual, setManual] = useState<Partial<Record<ChecklistKey, boolean>>>({});
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setManual(JSON.parse(saved));
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 기억한다
    }
  }, [storageKey]);

  const done = (item: ChecklistItem) => (item.auto ? item.done : Boolean(manual[item.key]));
  const count = items.filter(done).length;
  const total = items.length;
  const complete = count === total;

  const toggle = (item: ChecklistItem) => {
    if (item.auto) return;
    const next = { ...manual, [item.key]: !manual[item.key] };
    setManual(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // 무시
    }
    const willComplete = items.every((candidate) => (candidate.key === item.key ? next[item.key] : done(candidate)));
    if (willComplete) setBurst((n) => n + 1);
  };

  return (
    <div className="sign checklist">
      <SignTitle as="h3" ko="여행 체크리스트" text={m.title} />
      <div className="checklist-head">
        <p className={complete ? "checklist-progress is-complete" : "checklist-progress"} aria-live="polite">
          {complete ? m.allDone : fmt(m.progress, { done: count, total })}
        </p>
        <div className="checklist-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}>
          <span style={{ "--fill": count / total } as CSSProperties} />
        </div>
      </div>
      <ul className="checklist-items">
        {items.map((item) => {
          const checked = done(item);
          return (
            <li key={item.key}>
              <button
                type="button"
                className={`check-item${checked ? " is-done" : ""}${item.auto ? " is-auto" : ""}`}
                role="checkbox"
                aria-checked={checked}
                aria-disabled={item.auto}
                onClick={() => toggle(item)}
                title={item.auto ? m.auto : undefined}
              >
                <span className="check-box" key={checked ? "on" : "off"} aria-hidden="true">
                  {checked && <CheckIcon />}
                </span>
                <span className="check-label">{m.items[item.key]}</span>
                {item.auto && (
                  <span className="check-auto" aria-label={m.auto}>
                    <LinkIcon />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="checklist-note">
        <LinkIcon /> {m.auto}
      </p>
      {burst > 0 && (
        <div className="confetti" key={burst} aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              style={
                {
                  "--x": `${Math.cos((i / 28) * Math.PI * 2) * (90 + (i % 5) * 26)}px`,
                  "--y": `${Math.sin((i / 28) * Math.PI * 2) * (70 + (i % 4) * 22) - 40}px`,
                  "--r": `${(i * 47) % 360}deg`,
                  "--c": CONFETTI[i % CONFETTI.length],
                  "--d": `${(i % 6) * 18}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
