"use client";

import { useEffect, useState } from "react";
import type { HeroModel } from "@/lib/hero";
import type { Messages } from "@/lib/i18n/messages";
import { formatKst } from "@/lib/time";
import { EXECUTION_LEVELS, ExecutionBadge } from "./ExecutionBadge";
import { FlapText } from "./FlapText";
import type { ChecklistKey } from "@/lib/checklist";
import { BedIcon, MoonIcon, PinIcon, PlaneIcon, TrainIcon } from "./icons";

const LAMP_ICON: Record<ChecklistKey, React.ComponentType<{ className?: string }>> = {
  flights: PlaneIcon,
  stay: BedIcon,
  cities: PinIcon,
  lateCheckin: MoonIcon,
  rides: TrainIcon,
};

// 도착 안내 전광판: 실제 지하철 안내판처럼 "이번 / 다음" 두 줄.
// 이번 = 지금 처리할 일, 다음 = 입국(또는 귀국)까지. 윗줄에서 "어서 오세요"가 9개 언어로 돈다(마중 = 맞이함).
const WELCOME = [
  { text: "어서 오세요", lang: "ko" },
  { text: "Welcome", lang: "en" },
  { text: "ようこそ", lang: "ja" },
  { text: "欢迎", lang: "zh-CN" },
  { text: "Chào mừng", lang: "vi" },
  { text: "ยินดีต้อนรับ", lang: "th" },
  { text: "Selamat datang", lang: "id" },
  { text: "Bienvenido", lang: "es" },
  { text: "Bienvenue", lang: "fr" },
];

function useNow(intervalMs: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// 화면이 보일 때만 순환한다 (보이지 않는 반복 애니메이션은 멈춘다)
function useCycle(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [length, intervalMs]);
  return index;
}

function countdownText(target: string, now: Date, locale: string) {
  const minutes = Math.max(0, Math.floor((new Date(target).getTime() - now.getTime()) / 60_000));
  const unit = (value: number, name: "day" | "hour" | "minute") =>
    new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "narrow" }).format(value);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `${unit(days, "day")} ${unit(hours, "hour")}` : `${unit(hours, "hour")} ${unit(minutes % 60, "minute")}`;
}

function RowLabel({ ko, text }: { ko: string; text: string }) {
  return (
    <span className="board-row-label">
      <span lang="ko">{ko}</span>
      {text !== ko && <span>{text}</span>}
    </span>
  );
}

export function ArrivalBoard({ model, m, locale, realMail = false }: { model: HeroModel; m: Messages; locale: string; realMail?: boolean }) {
  const now = useNow(30_000);
  const welcome = WELCOME[useCycle(WELCOME.length, 3200)];
  const clock = now
    ? new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)
    : "--:--";

  return (
    <section className="board" aria-label={`${m.hero.current}: ${model.next.title}`}>
      <div className="board-screen">
        <div className="board-top">
          <p className="board-kind" aria-hidden="true">
            <PlaneIcon />
            <span lang="ko">도착</span>
            <span>ARRIVALS</span>
          </p>
          <p className="board-welcome" aria-hidden="true">
            <FlapText text={welcome.text} lang={welcome.lang} className="flap-tiles" />
          </p>
          <p className="board-clock" aria-label={`${clock} KST`}>
            <span className="board-clock-dot" aria-hidden="true" />
            <FlapText text={clock} className="flap-tiles" />
            <span className="board-tz">KST</span>
          </p>
        </div>

        <ol className="board-rows">
          <li className={`board-row ${model.next.line ? `board-line-${model.next.line}` : "board-line-led"}`}>
            <span className="board-dot" aria-hidden="true" />
            <RowLabel ko="이번" text={m.hero.current} />
            <div className="board-row-main" aria-live="polite">
              <p className="board-title">
                <FlapText text={model.next.title} />
              </p>
              {model.next.detail && <p className="board-detail">{model.next.detail}</p>}
            </div>
          </li>
          {model.countdown && (
            <li className="board-row board-line-arex">
              <span className="board-dot" aria-hidden="true" />
              <RowLabel ko="다음" text={m.hero.upcoming} />
              <div className="board-row-main">
                <p className="board-row-text">{model.countdown.label}</p>
                <p className="board-detail tabular">
                  {[model.countdown.place, formatKst(model.countdown.target, locale)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <strong className="board-row-time tabular">
                {now ? <FlapText text={countdownText(model.countdown.target, now, locale)} className="flap-tiles" /> : "—"}
              </strong>
            </li>
          )}
          {/* 준비 줄: 여행 체크리스트와 이어진다. 끝낸 항목은 램프가 켜지고, 누르면 체크리스트로 내려간다 */}
          <li className="board-row board-line-prep board-prep">
            <span className="board-dot" aria-hidden="true" />
            <RowLabel ko="준비" text={m.hero.prep} />
            <div className="board-row-main">
              <ul className="board-lamps">
                {model.checklist.items.map((item, i) => {
                  const Icon = LAMP_ICON[item.key];
                  return (
                    <li
                      key={`${item.key}-${item.done}`}
                      className={item.done ? "board-lamp is-on" : "board-lamp"}
                      style={{ "--i": i } as React.CSSProperties}
                      aria-label={`${m.checklist.items[item.key]}: ${item.done ? m.hero.done : m.hero.todo}`}
                    >
                      <Icon />
                      <span>{m.checklist.short[item.key]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <a className="board-row-time board-prep-count tabular" href="#checklist" aria-label={`${m.checklist.title}: ${model.checklist.done}/${model.checklist.total}`}>
              <FlapText text={`${model.checklist.done}/${model.checklist.total}`} className="flap-tiles" />
            </a>
          </li>
        </ol>
      </div>
      <div className="board-legend">
        <span>{m.hero.legend}</span>
        <ul>
          {EXECUTION_LEVELS.map((level) => (
            <li key={level}>
              <ExecutionBadge level={level} m={m} />
            </li>
          ))}
        </ul>
        {!realMail && <span className="board-demo">{m.hero.demoNote}</span>}
      </div>
    </section>
  );
}
