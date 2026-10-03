"use client";

import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/messages";
import { ChevronIcon } from "./icons";

// 브라우저 기본 날짜 입력은 운영체제 언어를 따르므로, 이용자 언어로 연·월·일을 보여주는 달력을 직접 그린다.
// 폼에는 기존과 같은 형식("YYYY-MM-DD", "YYYY-MM-DDTHH:MM")의 값만 넘긴다.

type Labels = Messages["date"];
type Common = { name: string; language: string; labels: Labels; ariaLabel: string };

// 월요일부터 시작하는 달력이 익숙한 언어
const MONDAY_FIRST = new Set(["es", "vi"]);

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const utc = (value: string) => new Date(`${value}T00:00:00Z`);

function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function formatFull(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(
    utc(value),
  );
}

export function DateField({ name, defaultValue = "", required, language, labels, ariaLabel }: Common & { defaultValue?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <span className="datefield">
      <DatePicker value={value} onChange={setValue} language={language} labels={labels} ariaLabel={ariaLabel} />
      {/* 필수 입력 검사를 브라우저에 맡기기 위해 보이지 않는 입력에 값을 둔다 */}
      <input className="datefield-value" name={name} value={value} required={required} onChange={() => {}} tabIndex={-1} aria-hidden="true" />
    </span>
  );
}

export function DateTimeField({ name, defaultValue = "", language, labels, ariaLabel }: Common & { defaultValue?: string }) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [hour, setHour] = useState(defaultValue.slice(11, 13));
  const [minute, setMinute] = useState(defaultValue.slice(14, 16));
  // 5분 단위로 고르되, 이미 저장된 값이 그 사이에 있으면 함께 보여준다
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));
  if (minute && !minutes.includes(minute)) minutes.splice(Math.floor(Number(minute) / 5) + 1, 0, minute);
  const value = date ? `${date}T${hour || "00"}:${minute || "00"}` : "";

  return (
    <span className="datefield datefield-time" role="group" aria-label={ariaLabel}>
      <DatePicker value={date} onChange={setDate} language={language} labels={labels} ariaLabel={ariaLabel} />
      <span className="timefield">
        <select className="field" value={hour} onChange={(e) => setHour(e.target.value)} aria-label={labels.hour}>
          <option value="">--</option>
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={pad(i)}>
              {pad(i)}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select className="field" value={minute} onChange={(e) => setMinute(e.target.value)} aria-label={labels.minute}>
          <option value="">--</option>
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </span>
      <input type="hidden" name={name} value={value} />
    </span>
  );
}

function DatePicker({
  value,
  onChange,
  language,
  labels,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  labels: Labels;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || todayKst()).slice(0, 7));
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const [year, month] = view.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mondayFirst = MONDAY_FIRST.has(language);
  const lead = (first.getUTCDay() + (mondayFirst ? 6 : 0)) % 7;
  const today = todayKst();
  const monthTitle = new Intl.DateTimeFormat(language, { timeZone: "UTC", year: "numeric", month: "long" }).format(first);
  const weekday = new Intl.DateTimeFormat(language, { timeZone: "UTC", weekday: "narrow" });
  // 2023-01-01은 일요일
  const weekdays = Array.from({ length: 7 }, (_, i) => weekday.format(new Date(Date.UTC(2023, 0, 1 + i + (mondayFirst ? 1 : 0)))));
  const dayLabel = new Intl.DateTimeFormat(language, { timeZone: "UTC", month: "long", day: "numeric", weekday: "long" });

  const shift = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setView(next.toISOString().slice(0, 7));
  };
  const toggle = () => {
    if (!open) setView((value || todayKst()).slice(0, 7));
    setOpen(!open);
  };

  return (
    <span className="datepicker" ref={root}>
      <button type="button" className="field datepicker-button" aria-label={ariaLabel} aria-expanded={open} aria-haspopup="dialog" onClick={toggle}>
        <span className={value ? "" : "muted"}>{value ? formatFull(value, language) : labels.pick}</span>
        <CalendarIcon />
      </button>
      {open && (
        <span className="calendar" role="dialog" aria-label={ariaLabel}>
          <span className="calendar-head">
            <button type="button" className="calendar-nav" onClick={() => shift(-1)} aria-label={labels.prevMonth}>
              <ChevronIcon direction="left" />
            </button>
            <span className="calendar-title" aria-live="polite">
              {monthTitle}
            </span>
            <button type="button" className="calendar-nav" onClick={() => shift(1)} aria-label={labels.nextMonth}>
              <ChevronIcon direction="right" />
            </button>
          </span>
          <span className="calendar-grid">
            {weekdays.map((name, i) => (
              <span key={`w${i}`} className="calendar-weekday" aria-hidden="true">
                {name}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = iso(year, month - 1, i + 1);
              const classes = ["calendar-day", day === value ? "is-selected" : "", day === today ? "is-today" : ""].join(" ");
              return (
                <button
                  key={day}
                  type="button"
                  className={classes}
                  aria-pressed={day === value}
                  aria-label={dayLabel.format(utc(day))}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </span>
        </span>
      )}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg className="datepicker-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
