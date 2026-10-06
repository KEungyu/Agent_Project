"use client";

import { useState, useTransition, type ReactNode } from "react";
import { flightStatusAction } from "@/app/actions";
import type { FlightStatusResult } from "@/lib/airport/flights";
import {
  AIRPORT_TERMINALS,
  AIRPORT_TRANSPORT,
  FLIGHT_INFO,
  facilitiesFor,
  stepsFor,
  type AirportCode,
  type FacilityKind,
  type Source,
  type Stage,
  type Terminal,
} from "@/lib/airport/guide";
import type { LanguageCode } from "@/lib/i18n/languages";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CoinsIcon, ExternalIcon, SimIcon, TerminalIcon } from "./icons";

// 공항 단계별 안내: 도착·출발·환승을 고르면 수속 순서, 확인된 시설, 시내 교통을 출처와 함께 보여 준다.
// 실시간 정보는 조회하지 않고 공식 운항 정보로 보낸다. 확인하지 못한 시설·시간은 지어내지 않는다.

const GUIDED = new Set<string>(["ICN", "GMP"]);
const isGuided = (code?: string): code is AirportCode => !!code && GUIDED.has(code);
const FACILITY_ICON = { sim: SimIcon, money: CoinsIcon, wifi: TerminalIcon } satisfies Record<FacilityKind, unknown>;

type Props = {
  arrivalAirport?: string;
  arrivalTerminal?: string;
  departureAirport?: string;
  arrivalFlightNo?: string;
  departureFlightNo?: string;
  language: LanguageCode;
  m: Messages["airportGuide"];
  airports: Messages["airports"];
  hotelUpdate?: ReactNode; // 도착 탭에서 숙소 도착 시각을 바꾸는 폼 (서버에서 그린다)
};

function defaultTerminal(airport: AirportCode, given?: string): Terminal | "unknown" {
  if (airport === "GMP") return "international";
  return given === "T1" || given === "T2" ? given : "unknown";
}

export function AirportGuide({ arrivalAirport, arrivalTerminal, departureAirport, arrivalFlightNo, departureFlightNo, language, m, airports, hotelUpdate }: Props) {
  const startStage: Stage = isGuided(arrivalAirport) ? "arrival" : "departure";
  const airportFor = (stage: Stage): AirportCode =>
    stage === "departure" && isGuided(departureAirport) ? departureAirport : isGuided(arrivalAirport) ? arrivalAirport : "ICN";
  const [stage, setStage] = useState<Stage>(startStage);
  const [airport, setAirport] = useState<AirportCode>(airportFor(startStage));
  const [terminal, setTerminal] = useState<Terminal | "unknown">(
    defaultTerminal(airportFor(startStage), airportFor(startStage) === arrivalAirport ? arrivalTerminal : undefined),
  );

  // 김해·제주처럼 단계별 안내가 없는 공항만 있으면 공식 사이트로 안내한다
  if (!isGuided(arrivalAirport) && !isGuided(departureAirport)) {
    const other = arrivalAirport ?? departureAirport;
    if (!other) return null;
    return (
      <section className="airport-guide" aria-label={m.title}>
        <p className="airport-other">{fmt(m.otherAirport, { airport: airports[other as keyof typeof airports] ?? other })}</p>
      </section>
    );
  }

  const pickStage = (next: Stage) => {
    setStage(next);
    const code = next === "transfer" ? "ICN" : airportFor(next);
    setAirport(code);
    setTerminal(defaultTerminal(code, code === arrivalAirport ? arrivalTerminal : undefined));
  };
  const pickAirport = (code: AirportCode) => {
    setAirport(code);
    setTerminal(defaultTerminal(code, code === arrivalAirport ? arrivalTerminal : undefined));
  };

  const name = (code: string) => airports[code as keyof typeof airports] ?? code;
  // 인천은 T1·T2의 수속 순서가 같다. 터미널을 모르면 순서만 보여 주고 시설은 터미널을 고른 뒤에 보여 준다
  const stepTerminal: Terminal = terminal === "unknown" ? "T1" : terminal;
  const steps = stage === "transfer" && airport !== "ICN" ? [] : stepsFor(airport, stepTerminal, stage);
  const facilities = terminal === "unknown" ? [] : facilitiesFor(airport, terminal, stage);
  const transport = stage === "arrival" ? AIRPORT_TRANSPORT[airport] : [];
  const conflict = stage === "departure" && departureAirport && departureAirport !== airport;
  const stages: Stage[] = ["arrival", "departure", "transfer"];

  return (
    <section className="airport-guide" aria-label={m.title}>
      <header className="tips-head">
        <h4 className="tips-title">
          <span lang="ko">공항 안내</span>
          {language !== "ko" && <span>{m.title}</span>}
        </h4>
      </header>

      <div className="ag-tabs" role="tablist" aria-label={m.title}>
        {stages.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={stage === value}
            className={stage === value ? "ag-tab is-on" : "ag-tab"}
            onClick={() => pickStage(value)}
          >
            {m[value]}
          </button>
        ))}
      </div>

      <div className="ag-pickers">
        {stage !== "transfer" && (
          <div className="ag-seg" role="group" aria-label={m.airport}>
            {(["ICN", "GMP"] as const).map((code) => (
              <button key={code} type="button" aria-pressed={airport === code} className={airport === code ? "is-on" : ""} onClick={() => pickAirport(code)}>
                {name(code)} <span className="ag-code">{code}</span>
              </button>
            ))}
          </div>
        )}
        <div className="ag-seg" role="group" aria-label={m.terminal}>
          {(airport === "ICN" ? (["T1", "T2", "unknown"] as const) : AIRPORT_TERMINALS.GMP).map((value) => (
            <button key={value} type="button" aria-pressed={terminal === value} className={terminal === value ? "is-on" : ""} onClick={() => setTerminal(value)}>
              {value === "unknown" ? m.unknownTerminal : value === "international" ? m.intl : value === "domestic" ? m.domestic : value}
            </button>
          ))}
        </div>
      </div>

      {conflict && (
        <p className="ag-warn" role="status">
          {fmt(m.conflict, { board: name(departureAirport), shown: name(airport) })}
        </p>
      )}
      {stage === "arrival" && <p className="ag-note">{m.landingNote}</p>}
      {terminal === "unknown" && <p className="ag-note">{m.unknownTerminalNote}</p>}

      {stage === "transfer" && airport !== "ICN" ? (
        <p className="ag-note">{m.noTransfer}</p>
      ) : (
        <>
          <p className="tips-col-title">{m.steps}</p>
          <ol className="ag-steps">
            {steps.map((step, i) => (
              <li key={i}>
                <span className="ag-num tabular">{i + 1}</span>
                <span className="ag-step-text">
                  {step.text[language]}
                  {step.note && <span className="ag-step-note">{step.note[language]}</span>}
                </span>
              </li>
            ))}
          </ol>
          <SourceLine source={steps.find((step) => step.source)?.source} m={m} />
        </>
      )}

      {terminal !== "unknown" && (
        <>
          <p className="tips-col-title">{m.facilities}</p>
          {facilities.length > 0 && (
            <ul className="ag-facilities">
              {facilities.map((facility) => {
                const Icon = FACILITY_ICON[facility.kind];
                return (
                  <li key={facility.name}>
                    <span className="tip-icon">
                      <Icon />
                    </span>
                    <span className="ag-fac-text">
                      <strong>{facility.name}</strong>
                      <span>{facility.where[language]}</span>
                      <span className="ag-fac-meta">
                        {[facility.hours ?? m.hoursUnknown, facility.area === "public" ? m.areaPublic : ""].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="ag-note">{m.notListed}</p>
          <SourceLine source={facilities[0]?.source} m={m} />
        </>
      )}

      {transport.length > 0 && (
        <>
          <p className="tips-col-title">{m.transport}</p>
          <ul className="ag-transport">
            {transport.map((fact, i) => (
              <li key={i}>{fact.text[language]}</li>
            ))}
          </ul>
          <SourceLine source={transport[0].source} m={m} />
        </>
      )}

      {/* 인천 도착·출발은 아래에서 실시간 조회를 하므로 "실시간은 확인하지 않음" 문구를 빼고 공식 링크만 둔다 */}
      <p className="ag-live">
        {!(airport === "ICN" && stage !== "transfer") && <>{m.liveNote} </>}
        <a href={FLIGHT_INFO[airport].url} target="_blank" rel="noopener noreferrer">
          {m.liveLink}
          <ExternalIcon />
        </a>
      </p>
      {stage !== "transfer" && (
        <LiveStatus
          key={`${stage}-${airport}`}
          direction={stage}
          airport={airport}
          boardAirport={stage === "arrival" ? arrivalAirport : departureAirport}
          flightNo={stage === "arrival" ? arrivalFlightNo : departureFlightNo}
          language={language}
          m={m}
        />
      )}

      {stage === "arrival" && hotelUpdate}
    </section>
  );
}

const LIVE_STATUS_KEY = {
  not_today: "liveNotToday",
  unconfigured: "liveUnconfigured",
  permission: "livePermission",
  timeout: "liveTimeout",
  error: "liveError",
  empty: "liveEmpty",
} as const;

// 보드의 항공편(번호·날짜)으로 인천공항 실시간 운항을 조회한다. 결과는 표시만 하고 보드에 쓰지 않는다
function LiveStatus({
  direction,
  airport,
  boardAirport,
  flightNo,
  language,
  m,
}: {
  direction: "arrival" | "departure";
  airport: AirportCode;
  boardAirport?: string;
  flightNo?: string;
  language: LanguageCode;
  m: Messages["airportGuide"];
}) {
  const [result, setResult] = useState<FlightStatusResult | null>(null);
  const [pending, startTransition] = useTransition();
  if (boardAirport !== airport) return null;
  if (airport === "GMP") return <p className="ag-note">{m.liveGmp}</p>;
  if (!flightNo) return <p className="ag-note">{m.liveNoFlight}</p>;
  const terminalLabel = (terminal?: string) => (terminal === "T1 Concourse" ? `T1 (Concourse)` : terminal);
  return (
    <div className="live-status" aria-live="polite">
      <button type="button" className="button-quiet" disabled={pending} onClick={() => startTransition(async () => setResult(await flightStatusAction(direction, language)))}>
        {fmt(m.liveCheck, { flight: flightNo })}
      </button>
      {result && result.status !== "ok" && (
        <p className={result.status === "unconfigured" || result.status === "not_today" ? "ag-note" : "ag-warn"} role="status">
          {m[LIVE_STATUS_KEY[result.status]]}
        </p>
      )}
      {result?.status === "ok" &&
        result.data!.map((flight) => (
          <dl key={flight.flightId + flight.scheduled} className="live-grid">
            <div>
              <dt>{m.liveScheduled}</dt>
              <dd className="tabular">{flight.scheduled}</dd>
            </div>
            {flight.estimated && flight.estimated !== flight.scheduled && (
              <div>
                <dt>{m.liveEstimated}</dt>
                <dd className="tabular">{flight.estimated}</dd>
              </div>
            )}
            {flight.remark && (
              <div>
                <dt>{m.liveRemark}</dt>
                <dd>{flight.remark}</dd>
              </div>
            )}
            {flight.terminal && (
              <div>
                <dt>{m.liveTerminal}</dt>
                <dd>{terminalLabel(flight.terminal)}</dd>
              </div>
            )}
            {flight.gate && (
              <div>
                <dt>{m.liveGate}</dt>
                <dd>{flight.gate}</dd>
              </div>
            )}
            {flight.carousel && (
              <div>
                <dt>{m.liveCarousel}</dt>
                <dd>{flight.carousel}</dd>
              </div>
            )}
            {flight.exit && (
              <div>
                <dt>{m.liveExit}</dt>
                <dd>{flight.exit}</dd>
              </div>
            )}
            {flight.operatedBy && <p className="ag-note">{fmt(m.liveOperatedBy, { flight: flight.operatedBy })}</p>}
          </dl>
        ))}
      {result?.status === "ok" && result.fetchedAt && (
        <p className="ag-note">{fmt(m.liveChecked, { time: new Date(result.fetchedAt).toLocaleTimeString(language, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }) })}</p>
      )}
    </div>
  );
}

function SourceLine({ source, m }: { source?: Source; m: Messages["airportGuide"] }) {
  if (!source) return null;
  return (
    <p className="ag-source">
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        {fmt(m.source, { date: source.checkedAt })}
        <ExternalIcon />
      </a>
    </p>
  );
}
