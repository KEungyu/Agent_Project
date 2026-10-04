"use client";

import { useEffect, useState, useTransition } from "react";
import { estimateTaxiAction, type TaxiPlaceInput, type TaxiResult } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { FarePeriod } from "@/lib/taxi/fare";
import { formatMoney } from "@/lib/currency/rates";
import { formatDate } from "@/lib/time";
import { LocateIcon, PlaneIcon, BedIcon, ShowIcon, SwapIcon, TaxiIcon } from "./icons";
import { SHOW_EVENT, type ShowEventDetail, type TaxiTarget } from "./ShowCards";
import { SignTitle } from "./SignTitle";

// 택시비 계산기: 출발지와 목적지를 넣으면 서울 미터기 요금으로 적정 범위를 보여준다.
// 결과는 택시 미터기 화면처럼 0원부터 올라가고, 지붕 표시등이 켜진다. 같은 출발·도착으로 택시 보여주기 카드를 바로 열 수 있다.

type Pick = { lat: number; lng: number; label: string };
// target: 보여주기 카드로 넘길 때 쓰는 원래 대상(숙소·공항). 현재 위치는 카드에 출발지로 쓰지 않는다.
type End = { text: string; pick?: Pick; target?: TaxiTarget; here?: boolean };
type Period = FarePeriod | "now";

// 공항 택시 승강장 근처 좌표. 요금표가 서울 기준이라 서울을 오가는 공항(인천·김포)만 둔다
const AIRPORTS: Record<string, { lat: number; lng: number }> = {
  ICN: { lat: 37.4492, lng: 126.4509 },
  GMP: { lat: 37.5583, lng: 126.7906 },
};
const FARE_SOURCE = "https://sftc.seoul.go.kr/seoul/mulga/main/contents.do?menuNo=200023";
const PERIODS: Period[] = ["now", "day", "late", "midnight"];
const won = new Intl.NumberFormat("en-US");

export function TaxiCalculator({
  stays,
  language,
  m,
  airports,
}: {
  stays: { id: string; name: string; address?: string }[];
  language: string;
  m: Messages["taxi"];
  airports: Messages["airports"];
}) {
  const [from, setFrom] = useState<End>({ text: "" });
  const [to, setTo] = useState<End>({ text: "" });
  const [period, setPeriod] = useState<Period>("now");
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<TaxiResult | null>(null);
  const [show, setShow] = useState<ShowEventDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [swapTurn, setSwapTurn] = useState(0);
  const [pending, startTransition] = useTransition();

  const toInput = (end: End): TaxiPlaceInput => end.pick ?? { text: end.text };

  const locate = () => {
    if (!navigator.geolocation) return setNotice(m.noLocation);
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setFrom({ text: m.here, pick: { lat: position.coords.latitude, lng: position.coords.longitude, label: m.here }, here: true });
      },
      () => {
        setLocating(false);
        setNotice(m.noLocation);
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setSwapTurn((n) => n + 1);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    // 결과를 낸 출발·도착을 그대로 택시 카드로 넘긴다(그 뒤에 입력을 고쳐도 결과와 카드가 어긋나지 않게)
    const detail: ShowEventDetail = {
      to: to.target ?? { kind: "text", text: to.text },
      from: from.here ? undefined : (from.target ?? { kind: "text", text: from.text }),
    };
    startTransition(async () => {
      const next = await estimateTaxiAction({ from: toInput(from), to: toInput(to), period, language });
      setResult(next);
      setShow(detail);
      if (!next.ok) setNotice(m.errors[next.error]);
    });
  };

  const picks = (set: (end: End) => void, current: End) => (
    <div className="taxi-picks">
      {stays.map((stay) => {
        const text = stay.address ?? stay.name;
        return (
          <button key={stay.id} type="button" className="taxi-pick" aria-pressed={!current.pick && current.text === text} onClick={() => set({ text, target: { kind: "stay", id: stay.id } })}>
            <BedIcon />
            {stay.name}
          </button>
        );
      })}
      {Object.entries(AIRPORTS).map(([code, point]) => {
        const label = airports[code as keyof Messages["airports"]];
        return (
          <button
            key={code}
            type="button"
            className="taxi-pick"
            aria-pressed={current.pick?.label === label}
            onClick={() => set({ text: label, pick: { ...point, label }, target: { kind: "airport", code } })}
          >
            <PlaneIcon />
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="sign taxi-calc">
      <SignTitle as="h3" ko="택시비 계산기" text={m.title} />
      <p className="show-sub">{m.sub}</p>
      <form className="taxi-form" onSubmit={submit}>
        <div className="taxi-ends">
          <div className="taxi-end">
            <label className="taxi-end-label" htmlFor="taxi-from">
              <span className="taxi-dot is-from" aria-hidden="true" />
              {m.from}
            </label>
            <div className="taxi-input-row">
              <input
                id="taxi-from"
                className="field"
                required
                maxLength={120}
                value={from.text}
                placeholder={m.fromPlaceholder}
                onChange={(event) => setFrom({ text: event.target.value })}
              />
              <button type="button" className="button-quiet taxi-here" onClick={locate} disabled={locating} aria-busy={locating}>
                <LocateIcon className={locating ? "is-spinning" : undefined} />
                {locating ? m.locating : m.here}
              </button>
            </div>
            {picks(setFrom, from)}
          </div>
          <button type="button" className="taxi-swap" onClick={swap} aria-label={m.swap} title={m.swap}>
            <SwapIcon key={swapTurn} className={swapTurn ? "is-turning" : undefined} />
          </button>
          <div className="taxi-end">
            <label className="taxi-end-label" htmlFor="taxi-to">
              <span className="taxi-dot is-to" aria-hidden="true" />
              {m.to}
            </label>
            <input
              id="taxi-to"
              className="field"
              required
              maxLength={120}
              value={to.text}
              placeholder={m.toPlaceholder}
              onChange={(event) => setTo({ text: event.target.value })}
            />
            {picks(setTo, to)}
          </div>
        </div>
        <fieldset className="taxi-when">
          <legend>{m.when}</legend>
          {/* 시간대는 서울 중형택시 심야 할증 구분이다: 22–23시와 02–04시는 +20%, 자정을 넘는 23–02시는 +40% */}
          {PERIODS.map((value) => {
            const sub = value === "day" ? m.daySub : value === "late" ? m.lateSub : value === "midnight" ? m.midnightSub : undefined;
            return (
              <label key={value} className={`taxi-when-option is-${value}`}>
                <input type="radio" name="taxi-period" value={value} checked={period === value} onChange={() => setPeriod(value)} />
                <span>
                  <strong className="tabular">{m[value]}</strong>
                  {sub && <small>{sub}</small>}
                </span>
              </label>
            );
          })}
        </fieldset>
        <button type="submit" className="button taxi-go" disabled={pending} aria-busy={pending}>
          <TaxiIcon />
          {pending ? m.checking : m.check}
        </button>
      </form>

      {notice && (
        <p className="taxi-notice" role="alert">
          {notice}
        </p>
      )}
      {result?.ok && show && (
        <TaxiMeter key={`${result.estimate.low}-${result.estimate.high}-${result.from}-${result.to}`} result={result} m={m} show={show} language={language} />
      )}
      <p className="taxi-basis">
        {m.basis}{" "}
        <a href={FARE_SOURCE} target="_blank" rel="noopener noreferrer">
          {m.source}
        </a>
        {" · "}
        {m.osm}
      </p>
    </div>
  );
}

function TaxiMeter({
  result,
  m,
  show,
  language,
}: {
  result: Extract<TaxiResult, { ok: true }>;
  m: Messages["taxi"];
  show: ShowEventDetail;
  language: string;
}) {
  const { estimate } = result;
  const low = useCountUp(estimate.low);
  const high = useCountUp(estimate.high);
  const rate = estimate.period === "day" ? m.dayRate : estimate.period === "late" ? m.night20 : m.night40;
  return (
    <div className="taxi-result" aria-live="polite">
      <div className="taxi-meter">
        <span className="taxi-lamp" aria-hidden="true">
          <span lang="ko">택시</span> TAXI
        </span>
        <p className="taxi-meter-label">{m.fair}</p>
        <p className="taxi-fare">
          <span className="taxi-won">₩</span>
          {won.format(low)}
          <span className="taxi-dash">–</span>
          {won.format(high)}
        </p>
        {/* 미터기와 함께 이용자 나라 돈으로도 올라간다 */}
        {result.rate && (
          <p className="taxi-local-money">
            ≈ {formatMoney(low * result.rate.perWon, result.rate.currency, language)} – {formatMoney(high * result.rate.perWon, result.rate.currency, language)}
            <span className="taxi-rate-note">
              {result.rate.live && result.rate.date ? fmt(m.rateOn, { date: formatDate(result.rate.date, language) }) : m.rateApprox} ·{" "}
              <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
                {m.rateSource}
              </a>
            </span>
          </p>
        )}
        <p className="taxi-trip">
          <span className="taxi-dot is-from" aria-hidden="true" />
          {result.from}
          <span aria-hidden="true">→</span>
          <span className="taxi-dot is-to" aria-hidden="true" />
          {result.to}
        </p>
        <p className="taxi-meta">
          <span>{fmt(m.meta, { km: result.km, min: estimate.minutesLow, max: estimate.minutesHigh })}</span>
          <span className={estimate.period === "day" ? "taxi-rate" : "taxi-rate is-night"}>{rate}</span>
        </p>
        {(result.approx || result.outsideSeoul) && (
          <p className="taxi-caveat">
            {result.approx && <span>{m.approx}</span>}
            {result.outsideSeoul && <span>{m.outside}</span>}
          </p>
        )}
      </div>
      <button type="button" className="button taxi-show" onClick={() => window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: show }))}>
        <ShowIcon />
        {m.showDriver}
      </button>
      <ul className="taxi-tips">
        <li>{m.tips.meter}</li>
        <li>{m.tips.toll}</li>
        <li>{m.tips.report}</li>
      </ul>
    </div>
  );
}

// 미터기처럼 0원에서 목표 금액까지 100원 단위로 올라간다
function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round((target * eased) / 100) * 100);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
