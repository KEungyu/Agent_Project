"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CHECKLIST_TIPS, type ChecklistItem } from "@/lib/checklist";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CheckIcon, LinkIcon } from "./icons";
import { SignTitle } from "./SignTitle";

// 여행 체크리스트: 여행 보드로 알 수 있는 항목만 두고 보드가 바뀌면 저절로 체크된다(전광판 "준비" 줄과 같은 값).
// 보드로 알 수 없는 준비는 아래에 작은 팁으로만 적는다. 이번 화면에서 마지막 항목이 채워지면 색종이가 터진다.

const CONFETTI = ["#2f86e0", "#00a5de", "#ff9a5c", "#ffd36e", "#7a63c9", "#3fb98b"];

export function Checklist({ items, m }: { items: ChecklistItem[]; m: Messages["checklist"] }) {
  const count = items.filter((item) => item.done).length;
  const total = items.length;
  const complete = count === total;
  const [burst, setBurst] = useState(0);
  const previous = useRef(count);

  useEffect(() => {
    if (complete && previous.current < total) setBurst((n) => n + 1);
    previous.current = count;
  }, [complete, count, total]);

  return (
    <div className="sign checklist" id="checklist">
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
        {items.map((item) => (
          <li key={item.key} className={`check-item${item.done ? " is-done" : ""}`}>
            <span className="check-box" key={item.done ? "on" : "off"} aria-hidden="true">
              {item.done && <CheckIcon />}
            </span>
            <span className="check-label">{m.items[item.key]}</span>
            <span className="sr-only">{item.done ? m.doneLabel : m.todoLabel}</span>
          </li>
        ))}
      </ul>
      <p className="checklist-note">
        <LinkIcon /> {m.auto}
      </p>
      <div className="checklist-tips">
        <p className="checklist-tips-title">{m.tipsTitle}</p>
        <ul>
          {CHECKLIST_TIPS.map((tip) => (
            <li key={tip}>{m.tips[tip]}</li>
          ))}
        </ul>
      </div>
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
