"use client";

import { useState, useTransition } from "react";
import { markTransportBookedAction, prepareTransportAction } from "@/app/actions";
import type { ItineraryItem } from "@/lib/board/types";
import { cityKo } from "@/lib/i18n/places";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CITIES } from "@/lib/map/cities";
import { cityIdOf, localCityName } from "@/lib/map/route";
import { formatDate } from "@/lib/time";
import { formatDuration } from "@/lib/transport/format";
import { transportOptions, viaRoutes, type TransportMode, type TransportOption } from "@/lib/transport/routes";
import { ExecutionBadge } from "./ExecutionBadge";
import { BusIcon, CheckIcon, ExternalIcon, PlaneIcon, SubwayIcon, TrainIcon } from "./icons";
import { VehicleArt } from "./VehicleArt";

// 가는 방법: 도시 일정의 구간마다 KTX·버스·비행기 같은 이동 수단을 보여주고,
// 마중이 예매 준비(경로 확인 → 수단 고르기 → 공식 예매 페이지 준비)를 해 준다.
// 결제와 확정은 이용자가 공식 사이트에서 직접 한다 (제품 불변 조건 6).

const MODE_ICON: Record<TransportMode, (props: { className?: string }) => React.ReactNode> = {
  ktx: TrainIcon,
  bus: BusIcon,
  flight: PlaneIcon,
  subway: SubwayIcon,
};

type Props = { itinerary: ItineraryItem[]; language: string; m: Messages };
// 한 가지 가는 방법: 바로 가면 구간 하나, 다른 도시를 거치면 구간 둘(hub에서 갈아탄다)
type Plan = { segments: TransportOption[]; hub?: string; minutes?: number };
const CITY_IDS = CITIES.map((city) => city.id);
const isMode = (value: string): value is TransportMode => value in MODE_ICON;

export function TransportPlanner({ itinerary, language, m }: Props) {
  const legs = itinerary.flatMap((item, i) => {
    const previous = itinerary[i - 1];
    return previous && previous.city !== item.city ? [{ from: previous, to: item }] : [];
  });

  return (
    <div className="legs">
      <TransportExplore language={language} m={m} />
      {legs.length > 0 && <h4 className="legs-title">
        <span lang="ko">가는 방법</span>
        {language !== "ko" && <span>{m.transport.title}</span>}
      </h4>}
      {legs.map((leg) => (
        <LegCard key={`${leg.to.date}-${leg.to.city}`} from={leg.from} to={leg.to} language={language} m={m} />
      ))}
      <p className="legs-note">{m.transport.note}</p>
    </div>
  );
}

function TransportExplore({ language, m }: Pick<Props, "language" | "m">) {
  const [from, setFrom] = useState("seoul");
  const [to, setTo] = useState("busan");
  const [date, setDate] = useState("");
  const item = (id: string): ItineraryItem => ({ city: CITIES.find((city) => city.id === id)!.name.en, date, transport: { status: "none" } });
  return <details className="transport-explore">
    <summary>{m.transport.explore}</summary>
    <div className="transport-explore-body">
      <p className="ag-note">{m.transport.catalogNote}</p>
      <div className="grid-2">{(["from", "to"] as const).map((field) => <label key={field} className="label">
        {field === "from" ? m.transit.fromLabel : m.transit.toLabel}
        <select className="field" value={field === "from" ? from : to} onChange={(event) => (field === "from" ? setFrom : setTo)(event.target.value)}>
          {CITIES.map((city) => <option key={city.id} value={city.id}>{language === "ko" ? city.name.ko : `${localCityName(city.name.en, language)} · ${city.name.ko}`}</option>)}
        </select>
      </label>)}</div>
      <label className="label">{m.board.date}<input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      {from !== to && date && <LegCard key={`${from}-${to}-${date}`} from={item(from)} to={item(to)} language={language} m={m} preview />}
      <p className="label">{m.transport.official}</p>
      <div className="travel-links">
        {([
          ["KTX · KORAIL", "https://www.letskorail.com/", "ktx"],
          ["SRT · SR", "https://etk.srail.kr/main.do?language=EN", "ktx"],
          ["Express bus · KOBUS", "https://www.kobus.co.kr/", "bus"],
          ["Intercity bus · T-money (English)", "https://intercitybuse.tmoney.co.kr/", "bus"],
          [m.airports.GMP, "https://www.airport.co.kr/gimpoeng/index.do", "flight"],
          [m.airports.ICN, "https://www.airport.kr/ap_en/index.do", "flight"],
        ] as [string, string, TransportMode][]).map(([name, url, mode]) => {
          const Icon = MODE_ICON[mode];
          return <a key={url} className={`travel-link is-${mode}`} href={url} target="_blank" rel="noopener noreferrer"><Icon className="travel-link-mode" /><span>{name}</span><ExternalIcon className="travel-link-go" /></a>;
        })}
      </div>
    </div>
  </details>;
}

function LegCard({ from, to, language, m, preview = false }: { from: ItineraryItem; to: ItineraryItem; language: string; m: Messages; preview?: boolean }) {
  const t = m.transport;
  const fromId = cityIdOf(from.city);
  const toId = cityIdOf(to.city);
  const direct = fromId && toId ? transportOptions(fromId, toId) : [];
  // 바로 가는 길이 없으면 다른 도시를 거쳐 가는 길을 제안한다
  const plans: Plan[] =
    direct.length > 0
      ? direct.map((option) => ({ segments: [option], minutes: option.minutes }))
      : fromId && toId
        ? viaRoutes(fromId, toId, CITY_IDS).map((route) => ({ segments: route.legs, hub: route.hub, minutes: route.minutes }))
        : [];
  const viaOnly = direct.length === 0 && plans.length > 0;
  const status = to.transport.status;
  const [choice, setChoice] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "ready">(status === "planned" ? "ready" : "idle");
  const [saveError, setSaveError] = useState(false);
  const [, startTransition] = useTransition();

  const plan: Plan | undefined = plans[choice];
  const bookable = plan?.segments.filter((segment) => segment.booking) ?? [];
  const fromName = localCityName(from.city, language);
  const toName = localCityName(to.city, language);
  // 정적 후보를 정리한 상태만 기록한다. 실시간 검색이나 자동 사이트 열기를 흉내 내지 않는다.
  const run = () => {
    setPhase("running"); setSaveError(false);
    startTransition(async () => {
      try { await prepareTransportAction(to.date, to.city); setPhase("ready"); }
      catch { setPhase("idle"); setSaveError(true); }
    });
  };

  // 고른 방법의 수단을 "flight+subway"처럼 남긴다
  const markBooked = () => {
    if (!plan) return;
    startTransition(() => markTransportBookedAction(to.date, to.city, plan.segments.map((segment) => segment.mode).join("+")));
  };

  // 지하철처럼 예매할 수단만 있는 구간은 "교통편 없음"이 아니다
  const free = status === "none" && plans.length > 0 && plans.every((item) => item.segments.every((segment) => !segment.booking));
  const bookedModes = (to.transport.note ?? "").split("+").filter(isMode);
  const bookedMode = bookedModes.length > 0 ? bookedModes.map((mode) => t[mode]).join(" + ") : to.transport.note;
  const hubName = (hub?: string) => (hub ? localCityName(CITIES.find((city) => city.id === hub)?.name.en ?? hub, language) : "");
  const chip =
    status === "booked_by_user" ? (
      <span className="leg-chip is-booked">
        <CheckIcon />
        {bookedMode ? fmt(t.bookedAs, { mode: bookedMode }) : m.board.transportBooked}
      </span>
    ) : status === "planned" ? (
      <span className="leg-chip is-planned">{m.board.transportPlanned}</span>
    ) : free ? (
      <span className="leg-chip is-free">{m.board.transportFree}</span>
    ) : (
      <span className="leg-chip is-none">{m.board.transportNone}</span>
    );

  return (
    <article className={`leg is-${status}`}>
      <header className="leg-head">
        <p className="leg-route">
          <span className="leg-city">
            <span lang="ko">{cityKo(from.city) ?? from.city}</span>
            {fromName !== cityKo(from.city) && <span className="leg-local">{fromName}</span>}
          </span>
          <span className="leg-arrow" aria-hidden="true" />
          <span className="leg-city">
            <span lang="ko">{cityKo(to.city) ?? to.city}</span>
            {toName !== cityKo(to.city) && <span className="leg-local">{toName}</span>}
          </span>
        </p>
        <span className="leg-date tabular">{formatDate(to.date, language)}</span>
        {!preview && status !== "booked_by_user" && !free && <ExecutionBadge key={phase} level="준비" m={m} />}
        {!preview && chip}
      </header>

      {status === "booked_by_user" && <p className="ag-note">{t.bookingRecord}</p>}
      {status === "booked_by_user" && (
        <Ticket
          modes={bookedModes.length > 0 ? bookedModes : [plans[0]?.segments[0]?.mode ?? "ktx"]}
          plans={plans}
          fromName={{ ko: cityKo(from.city) ?? from.city, local: fromName }}
          toName={{ ko: cityKo(to.city) ?? to.city, local: toName }}
          date={formatDate(to.date, language)}
          m={m}
        />
      )}

      {saveError && <p role="status" className="ag-warn">{t.saveError}</p>}
      {status !== "booked_by_user" &&
        (plans.length === 0 ? (
          <p className="leg-unknown">{t.unknown}</p>
        ) : (
          <>
            {viaOnly && <p className="leg-via-note">{t.noDirect}</p>}
            <div className="leg-options" role="radiogroup" aria-label={t.title}>
              {plans.map((item, i) => {
                const [first] = item.segments;
                const Icon = MODE_ICON[first.mode];
                return (
                  <button
                    key={item.segments.map((segment) => segment.mode).join("+") + (item.hub ?? "")}
                    type="button"
                    role="radio"
                    aria-checked={i === choice}
                    className={`leg-option mode-${first.mode}${item.hub ? " is-via" : ""}`}
                    disabled={phase === "running"}
                    onClick={() => setChoice(i)}
                  >
                    <span className="mode-tile">
                      <Icon />
                    </span>
                    <span className="leg-option-main">
                      <span className="leg-mode">
                        {item.hub ? fmt(t.via, { city: hubName(item.hub) }) : t[first.mode]}
                      </span>
                      {item.hub ? (
                        <span className="leg-via-steps">
                          {item.segments.map((segment, j) => {
                            const SegmentIcon = MODE_ICON[segment.mode];
                            return (
                              <span key={j} className={`leg-via-step mode-${segment.mode}`} style={{ "--j": j } as React.CSSProperties}>
                                <SegmentIcon />
                                <span>{t[segment.mode]}</span>
                                <span className="leg-stations" lang="ko">
                                  {segment.from.ko} → {segment.to.ko}
                                  {language !== "ko" && <span lang="en">{segment.from.en} → {segment.to.en}</span>}
                                </span>
                              </span>
                            );
                          })}
                          {item.segments[0].to.ko !== item.segments[1].from.ko && <span className="ag-warn">{fmt(t.connectionGap, {
                            from: language === "ko" ? item.segments[0].to.ko : `${item.segments[0].to.en} (${item.segments[0].to.ko})`,
                            to: language === "ko" ? item.segments[1].from.ko : `${item.segments[1].from.en} (${item.segments[1].from.ko})`,
                          })}</span>}
                          <span className="leg-via-change">{fmt(t.change, { city: hubName(item.hub) })}</span>
                        </span>
                      ) : (
                        <span className="leg-stations" lang="ko">
                          {first.from.ko} → {first.to.ko}
                          {language !== "ko" && <span lang="en">{first.from.en} → {first.to.en}</span>}
                        </span>
                      )}
                    </span>
                    {item.minutes && <span className="leg-time">{formatDuration(item.minutes, t)}</span>}
                  </button>
                );
              })}
            </div>

            {bookable.length === 0 ? (
              <p className="leg-free">{t.noBooking}</p>
            ) : preview ? (
              <div className="travel-links">{bookable.map((segment) => <a key={segment.mode + segment.from.en} className={`travel-link is-${segment.mode}`} href={segment.booking!.url} target="_blank" rel="noopener noreferrer">{(() => { const Icon = MODE_ICON[segment.mode]; return <Icon className="travel-link-mode" />; })()}<span>{fmt(t.open, { site: segment.booking!.name })}</span><ExternalIcon className="travel-link-go" /></a>)}</div>
            ) : phase === "idle" ? (
              <button type="button" className="button leg-ask" onClick={run}>
                <img className="leg-avatar" src="/mascot/majung-panda.png" alt="" width={28} height={28} />
                {t.ask}
              </button>
            ) : (
              <div className="leg-agent" aria-live="polite">
                <img className={phase === "running" ? "leg-agent-panda is-working" : "leg-agent-panda"} src="/mascot/majung-panda.png" alt="" width={44} height={44} />
                <div className="leg-agent-body">
                  <p className="leg-planned">{t.catalogNote}</p>
                  {phase === "ready" && (
                    <div className="leg-ready">

                      <div className="leg-actions">
                        {bookable.map((segment) => (
                          <a key={segment.mode + segment.from.en} className="button" href={segment.booking!.url} target="_blank" rel="noopener noreferrer">
                            {fmt(t.open, { site: segment.booking!.name })}
                            <ExternalIcon className="leg-go" />
                          </a>
                        ))}
                        <button type="button" className="button-quiet" onClick={markBooked}>
                          <CheckIcon className="leg-go" />
                          {t.booked}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ))}
    </article>
  );
}

// 예매 완료 승차권: 수단마다 색과 탈것 그림이 다르고, 탈것이 한 번 달려 들어온다.
// 다른 도시를 거쳐 가면 첫 수단의 색과 그림을 쓰고, 출발은 첫 구간, 도착은 마지막 구간 역으로 적는다.
function Ticket({
  modes,
  plans,
  fromName,
  toName,
  date,
  m,
}: {
  modes: TransportMode[];
  plans: Plan[];
  fromName: { ko: string; local: string };
  toName: { ko: string; local: string };
  date: string;
  m: Messages;
}) {
  const t = m.transport;
  const mode = modes[0];
  const plan = plans.find((item) => item.segments.map((segment) => segment.mode).join("+") === modes.join("+"));
  const Icon = MODE_ICON[mode];
  const first = plan?.segments[0];
  const last = plan?.segments.at(-1);
  const from = first ? { ko: first.from.ko, sub: first.from.en } : { ko: fromName.ko, sub: fromName.local };
  const to = last ? { ko: last.to.ko, sub: last.to.en } : { ko: toName.ko, sub: toName.local };
  const minutes = plan?.minutes;
  return (
    <div className={`ticket ticket-${mode}`}>
      <div className="ticket-main">
        <p className="ticket-top">
          <span className="ticket-mode">
            <Icon />
            {modes.map((item) => t[item]).join(" + ")}
          </span>
          <span className="tabular">{date}</span>
        </p>
        <div className="ticket-route">
          <p className="ticket-end">
            <span lang="ko">{from.ko}</span>
            <span className="ticket-sub">{from.sub}</span>
          </p>
          <div className="ticket-track" aria-hidden="true">
            <VehicleArt mode={mode} className="ticket-vehicle" />
          </div>
          <p className="ticket-end is-to">
            <span lang="ko">{to.ko}</span>
            <span className="ticket-sub">{to.sub}</span>
          </p>
        </div>
        <p className="ticket-foot">
          {minutes ? `${formatDuration(minutes, t)} · ` : ""}
          {t.goodTrip}
        </p>
      </div>
      <div className="ticket-stub" aria-hidden="true">
        <span className="ticket-stamp">
          <CheckIcon />
        </span>
        <span className="ticket-barcode" />
      </div>
    </div>
  );
}
