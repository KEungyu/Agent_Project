"use client";

import { useEffect, useState, type CSSProperties } from "react";

export type Bar = { label: string; note: string; unit: string; before: number; after: number | null; showReduction?: boolean };

// 숫자가 0에서 목표값까지 올라간다 (모션 줄이기면 바로 최종값)
function useCountUp(target: number | null, delayMs: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now() + delayMs;
    const tick = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - start) / 900));
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, delayMs]);
  return value;
}

const format = (value: number, target: number) => (Number.isInteger(target) ? Math.round(value) : value.toFixed(1));

function Row({ bar, index }: { bar: Bar; index: number }) {
  const max = Math.max(bar.before, bar.after ?? 0, 1);
  const before = useCountUp(bar.before, index * 120);
  const after = useCountUp(bar.after, index * 120 + 300);
  return (
    <li className="bar-row" style={{ "--i": index } as CSSProperties}>
      <p className="bar-label">
        {bar.label}
        <span>{bar.note}</span>
        {bar.showReduction && bar.after !== null && bar.before > 0 && (
          <strong className="bar-reduction tabular">−{Math.round((1 - bar.after / bar.before) * 100)}%</strong>
        )}
      </p>
      <div className="bar-line bar-before">
        <span className="bar-track">
          <span className="bar-fill" style={{ "--w": bar.before / max } as CSSProperties} />
        </span>
        <span className="bar-value tabular">
          {format(before, bar.before)}
          {bar.unit}
        </span>
      </div>
      <div className="bar-line bar-after">
        <span className="bar-track">
          <span className="bar-fill" style={{ "--w": (bar.after ?? 0) / max } as CSSProperties} />
        </span>
        <span className="bar-value tabular">{bar.after === null ? "—" : `${format(after, bar.after)}${bar.unit}`}</span>
      </div>
    </li>
  );
}

export function ReportBars({ bars }: { bars: Bar[] }) {
  return (
    <div className="report-visual">
      <div className="bar-legend" aria-hidden="true">
        <span className="bar-key bar-key-before">적용 전 (예상치)</span>
        <span className="bar-key bar-key-after">적용 후 (이 앱 기록)</span>
      </div>
      <ol className="bars">
        {bars.map((bar, index) => (
          <Row key={bar.label} bar={bar} index={index} />
        ))}
      </ol>
    </div>
  );
}
