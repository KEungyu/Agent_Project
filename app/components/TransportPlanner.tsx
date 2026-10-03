"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markTransportBookedAction, prepareTransportAction } from "@/app/actions";
import type { ItineraryItem } from "@/lib/board/types";
import { cityKo } from "@/lib/i18n/places";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { cityIdOf, localCityName } from "@/lib/map/route";
import { formatDate } from "@/lib/time";
import { formatDuration } from "@/lib/transport/format";
import { transportOptions, type TransportMode, type TransportOption } from "@/lib/transport/routes";
import { ExecutionBadge } from "./ExecutionBadge";
import { BusIcon, CheckIcon, ExternalIcon, PlaneIcon, SubwayIcon, TrainIcon } from "./icons";
import { VehicleArt } from "./VehicleArt";

// 가는 방법: 도시 일정의 구간마다 KTX·버스·비행기 같은 이동 수단을 보여주고,
// 마중이 예매 준비(경로 확인 → 수단 고르기 → 공식 예매 페이지 준비)를 해 준다.
// 결제와 확정은 이용자가 공식 사이트에서 직접 한다 (제품 불변 조건 6).

const STEP_MS = 750;
const MODE_ICON: Record<TransportMode, (props: { className?: string }) => React.ReactNode> = {
  ktx: TrainIcon,
  bus: BusIcon,
  flight: PlaneIcon,
  subway: SubwayIcon,
};

type Props = { itinerary: ItineraryItem[]; language: string; m: Messages };

export function TransportPlanner({ itinerary, language, m }: Props) {
  const legs = itinerary.flatMap((item, i) => {
    const previous = itinerary[i - 1];
    return previous && previous.city !== item.city ? [{ from: previous, to: item }] : [];
  });
  if (legs.length === 0) return null;
  return (
    <div className="legs">
      <h4 className="legs-title">
        <span lang="ko">가는 방법</span>
        {language !== "ko" && <span>{m.transport.title}</span>}
      </h4>
      {legs.map((leg) => (
        <LegCard key={`${leg.to.date}-${leg.to.city}`} from={leg.from} to={leg.to} language={language} m={m} />
      ))}
      <p className="legs-note">{m.transport.note}</p>
    </div>
  );
}

function LegCard({ from, to, language, m }: { from: ItineraryItem; to: ItineraryItem; language: string; m: Messages }) {
  const t = m.transport;
  const fromId = cityIdOf(from.city);
  const toId = cityIdOf(to.city);
  const options = fromId && toId ? transportOptions(fromId, toId) : [];
  const status = to.transport.status;
  const [choice, setChoice] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "ready">(status === "planned" ? "ready" : "idle");
  const [step, setStep] = useState(status === "planned" ? 3 : 0);
  // 방금 이 화면에서 준비를 진행했는지 (다시 열었을 때는 단계 대신 "준비해 뒀어요"만 보여준다)
  const [justRan, setJustRan] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const option: TransportOption | undefined = options[choice];
  const fromName = localCityName(from.city, language);
  const toName = localCityName(to.city, language);
  const steps = [fmt(t.step1, { from: fromName, to: toName }), fmt(t.step2, { date: formatDate(to.date, language) }), t.step3];

  // 단계를 하나씩 체크하며 진행하고, 끝나면 이 구간을 "준비됨"으로 저장한다
  const run = () => {
    setPhase("running");
    setJustRan(true);
    setStep(0);
    const tick = (n: number) => {
      timer.current = setTimeout(() => {
        setStep(n);
        if (n < steps.length) return tick(n + 1);
        setPhase("ready");
        startTransition(() => prepareTransportAction(to.date, to.city));
      }, STEP_MS);
    };
    tick(1);
  };

  const markBooked = () => {
    if (!option) return;
    startTransition(() => markTransportBookedAction(to.date, to.city, option.mode));
  };

  // 지하철처럼 예매할 수단만 있는 구간은 "교통편 없음"이 아니다
  const free = status === "none" && options.length > 0 && options.every((item) => !item.booking);
  const bookedMode = to.transport.note && to.transport.note in MODE_ICON ? t[to.transport.note as TransportMode] : to.transport.note;
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
        {status !== "booked_by_user" && !free && <ExecutionBadge key={phase} level="준비" m={m} />}
        {chip}
      </header>

      {status === "booked_by_user" && (
        <Ticket
          mode={(to.transport.note && to.transport.note in MODE_ICON ? to.transport.note : options[0]?.mode ?? "ktx") as TransportMode}
          options={options}
          fromName={{ ko: cityKo(from.city) ?? from.city, local: fromName }}
          toName={{ ko: cityKo(to.city) ?? to.city, local: toName }}
          date={formatDate(to.date, language)}
          m={m}
        />
      )}

      {status !== "booked_by_user" &&
        (options.length === 0 ? (
          <p className="leg-unknown">{t.unknown}</p>
        ) : (
          <>
            <div className="leg-options" role="radiogroup" aria-label={t.title}>
              {options.map((item, i) => {
                const Icon = MODE_ICON[item.mode];
                return (
                  <button
                    key={item.mode}
                    type="button"
                    role="radio"
                    aria-checked={i === choice}
                    className={`leg-option mode-${item.mode}`}
                    disabled={phase === "running"}
                    onClick={() => setChoice(i)}
                  >
                    <span className="mode-tile">
                      <Icon />
                    </span>
                    <span className="leg-option-main">
                      <span className="leg-mode">
                        {t[item.mode]}
                        {i === 0 && options.length > 1 && <span className="leg-rec">{t.recommended}</span>}
                      </span>
                      <span className="leg-stations" lang="ko">
                        {item.from.ko} → {item.to.ko}
                      </span>
                    </span>
                    {item.minutes && <span className="leg-time">{formatDuration(item.minutes, t)}</span>}
                  </button>
                );
              })}
            </div>

            {option?.mode === "subway" || !option?.booking ? (
              <p className="leg-free">{t.noBooking}</p>
            ) : phase === "idle" ? (
              <button type="button" className="button leg-ask" onClick={run}>
                <img className="leg-avatar" src="/mascot/majung-panda.png" alt="" width={28} height={28} />
                {t.ask}
              </button>
            ) : (
              <div className="leg-agent" aria-live="polite">
                <img className={phase === "running" ? "leg-agent-panda is-working" : "leg-agent-panda"} src="/mascot/majung-panda.png" alt="" width={44} height={44} />
                <div className="leg-agent-body">
                  {justRan ? (
                    <ol className="leg-steps">
                      {steps.map((text, i) => (
                        <li key={text} className={i < step ? "is-done" : i === step ? "is-active" : ""}>
                          <span className="leg-step-mark">{i < step && <CheckIcon />}</span>
                          {text}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="leg-planned">{t.planned}</p>
                  )}
                  {phase === "ready" && (
                    <div className="leg-ready">
                      {justRan && <p>{t.ready}</p>}
                      <div className="leg-actions">
                        <a className="button" href={option.booking.url} target="_blank" rel="noopener noreferrer">
                          {fmt(t.open, { site: option.booking.name })}
                          <ExternalIcon className="leg-go" />
                        </a>
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

// 예매 완료 승차권: 수단마다 색과 탈것 그림이 다르고, 탈것이 한 번 달려 들어온다
function Ticket({
  mode,
  options,
  fromName,
  toName,
  date,
  m,
}: {
  mode: TransportMode;
  options: TransportOption[];
  fromName: { ko: string; local: string };
  toName: { ko: string; local: string };
  date: string;
  m: Messages;
}) {
  const t = m.transport;
  const option = options.find((item) => item.mode === mode);
  const Icon = MODE_ICON[mode];
  const from = option ? { ko: option.from.ko, sub: option.from.en } : { ko: fromName.ko, sub: fromName.local };
  const to = option ? { ko: option.to.ko, sub: option.to.en } : { ko: toName.ko, sub: toName.local };
  return (
    <div className={`ticket ticket-${mode}`}>
      <div className="ticket-main">
        <p className="ticket-top">
          <span className="ticket-mode">
            <Icon />
            {t[mode]}
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
          {option?.minutes ? `${formatDuration(option.minutes, t)} · ` : ""}
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
