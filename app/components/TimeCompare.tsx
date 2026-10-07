"use client";

import { useEffect, useId, useState } from "react";
import { compareKoreaTime, kstDate, formatTimeKst } from "@/lib/time";
import { fmt, type Messages } from "@/lib/i18n/messages";

// ponytail: 브라우저의 IANA 시간대 자료로 계산한다. 국가를 추측하거나 별도 시간 API를 부르지 않는다.
export function TimeCompare({ language, m, arrival }: { language: string; m: Messages["timeCompare"]; arrival?: string }) {
  const [zone, setZone] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const listId = useId();
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setZones([...new Set([device, "UTC", ...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [])])].sort());
    try { setZone(sessionStorage.getItem("majungi-home-timezone") || device); } catch { setZone(device); }
    const now = new Date().toISOString();
    setInput(`${kstDate(now)}T${formatTimeKst(now, "en-GB")}`);
  }, []);
  const result = compareKoreaTime(input, zone, language);
  return <details className="time-compare">
    <summary>{m.title}</summary>
    <div className="time-compare-body">
      <p className="ag-note">{m.note}</p>
      <label className="label">{m.zone}
        <input className="field" list={listId} placeholder="Europe/Paris" value={zone} onChange={(event) => {
          const value = event.target.value;
          setZone(value);
          if (compareKoreaTime(input, value, language)) try { sessionStorage.setItem("majungi-home-timezone", value); } catch { /* 표시 기능은 계속 동작한다. */ }
        }} />
      </label>
      <datalist id={listId}>{zones.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</datalist>
      <label className="label">{m.koreaInput}<input className="field" type="datetime-local" value={input} onChange={(event) => setInput(event.target.value)} /></label>
      {arrival && <button type="button" className="button-quiet" onClick={() => setInput(`${kstDate(arrival)}T${formatTimeKst(arrival, "en-GB")}`)}>{m.useArrival}</button>}
      {result ? <output aria-live="polite">
        <span>{m.korea}<strong>{result.korea} · Asia/Seoul</strong></span>
        <span>{m.home}<strong>{result.home} · {zone}</strong></span>
        <span>{fmt(m.offset, { offset: result.offset })}</span>
      </output> : input && zone && <p className="ag-warn" role="status">{m.invalid}</p>}
      <p className="ag-note">{m.unchanged}</p>
    </div>
  </details>;
}
