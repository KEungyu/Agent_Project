"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { placeStationsAction, transitPathsAction, scheduledTransitAction, type PlaceStations } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import type { OdsayResult, TransitPath } from "@/lib/transit/odsay";
import type { LastTrainCheck } from "@/lib/transit/lasttrain";
import type { ScheduledRoutes } from "@/lib/transit/scheduled";
import { scheduledDeparture } from "@/lib/transit/schedule-time";
import { scheduledTransit, transitPaths } from "@/lib/transit/routes";
import {
  MAP_BBOX,
  SUBWAY,
  findStations,
  getLine,
  getStation,
  legDirection,
  lineName,
  project,
  smoothPath,
  stationName,
  subwayRoute,
  terminusName,
  type SubwayRoute,
  type SubwayStation,
} from "@/lib/transit/subway";
import { ExternalIcon } from "./icons";

// 지하철 안내. 지도 위에 실제 선로 모양으로 노선을 그리고(OSM, ODbL), 시간·요금·막차는 ODsay가 연결됐을 때만 보여 준다.
// 위치 권한을 쓰지 않는다: 출발·도착은 이용자가 역 이름을 넣거나, 노선도에서 고르거나, 숙소·식당·입력한 장소의 가까운 역을 고른다.

type M = Messages["transit"];
// 브라우저용 WEB 플랫폼 키만 공개한다. 서버용 ODSAY_API_KEY는 이 경계로 전달하지 않는다.
// NEXT_PUBLIC 값은 next build 때 고정되므로 설정 변경 후 반드시 다시 빌드한다.
const webOptions = { env: {
  ODSAY_API_KEY: process.env.NEXT_PUBLIC_ODSAY_WEB_KEY,
  ODSAY_MULTILANG: process.env.NEXT_PUBLIC_ODSAY_MULTILANG,
} };
const webEnabled = !!webOptions.env.ODSAY_API_KEY?.trim();
const OFFICIAL = [
  { name: "Seoul Metro", url: "https://www.seoulmetro.co.kr/" },
  { name: "Seoul TOPIS", url: "https://topis.seoul.go.kr/" },
];
// 공항 바로 고르기 (짧은 이름. 목록에 없는 언어는 other)
const AIRPORT_STATIONS: { ko: string; short: Record<string, string> }[] = [
  { ko: "인천공항1터미널", short: { ko: "인천공항 T1", ja: "仁川空港 T1", "zh-CN": "仁川机场 T1", other: "Incheon T1" } },
  { ko: "인천공항2터미널", short: { ko: "인천공항 T2", ja: "仁川空港 T2", "zh-CN": "仁川机场 T2", other: "Incheon T2" } },
  { ko: "김포공항", short: { ko: "김포공항", ja: "金浦空港", "zh-CN": "金浦机场", other: "Gimpo" } },
];

// 화면 언어 이름 · 표지판의 한국어 이름 (한국어 화면이거나 화면 언어 이름이 없으면 한국어만)
const stationLabel = (s: SubwayStation, language: string) => {
  const local = stationName(s, language);
  return local === s.ko ? s.ko : `${local} · ${s.ko}`;
};

// 여행 보드의 숙소·예약한 식당 (출발·도착 후보). query는 지도 검색에 넣을 이름·주소
export type TransitPlace = { label: string; query: string };
type Field = "from" | "to";
type PlaceNote = { label: string; meters: number };
type OnlinePaths = OdsayResult<(TransitPath & { lastTrain?: LastTrainCheck })[]>;
type Arrival = { airport?: string; datetime?: string };

export function TransitGuide({ language, m, places = [], arrival }: { language: string; m: M; places?: TransitPlace[]; arrival?: Arrival }) {
  const [region, setRegion] = useState("seoul");
  const regionId = useId();
  // 언어 변경은 본문을 다시 만든다. 여행 데이터가 아닌 이 탭의 표시 지역만 유지한다.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("majungi-transit-region");
      if (saved === "busan" || saved === "daegu") setRegion(saved);
    } catch { /* 저장소를 차단한 브라우저에서는 기본 지역을 쓴다. */ }
  }, []);
  const changeRegion = (value: string) => {
    setRegion(value);
    try { sessionStorage.setItem("majungi-transit-region", value); } catch { /* 화면 선택은 계속 가능하다. */ }
  };
  return (
    <section className="transit" aria-label={m.title}>
      <label className="transit-region" htmlFor={regionId}>
        <span className="label">{m.region}</span>
        <select id={regionId} className="field" value={region} onChange={(event) => changeRegion(event.target.value)}>
          <option value="seoul">{m.regionSeoul}</option>
          <option value="busan">{m.regionBusan}</option>
          <option value="daegu">{m.regionDaegu}</option>
        </select>
      </label>
      <details className="transit-tmoney">
        <summary>{m.tmoneyTitle}</summary>
        <p>{m.tmoneyBuy}</p>
        <p>{m.tmoneyRide}</p>
        <p>{m.tmoneyLimits}</p>
        <p className="transit-official"><span>{m.officialTitle}</span>
          <a href="https://pay.tmoney.co.kr/" target="_blank" rel="noopener noreferrer">T-money <ExternalIcon /></a>
        </p>
      </details>
      {region === "seoul" ? <>
        <p className="transit-area">{m.area}</p>
        <SubwayPanel language={language} m={m} places={places} arrival={arrival} />
      </> : <RegionalTransitNotice region={region === "busan" ? "busan" : "daegu"} m={m} />}
    </section>
  );
}

// 김은규 님의 지역별 지도 데이터가 합쳐지기 전에는 수도권 경로·요금을 대신 표시하지 않는다.
export function RegionalTransitNotice({ region, m }: { region: "busan" | "daegu"; m: M }) {
  const busan = region === "busan";
  return <div className="transit-regional" role="status">
    <p className="ag-note">{fmt(m.regionalExternal, { region: busan ? m.regionBusan : m.regionDaegu })}</p>
    <p className="transit-official"><span>{m.officialTitle}</span>
      <a href={busan ? "https://www2.humetro.busan.kr/homepage/cyberstation/mapeng.do" : "https://www.dtro.or.kr/"} target="_blank" rel="noopener noreferrer">
        {busan ? "Busan Transportation Corporation" : "Daegu Transportation Corporation"} <ExternalIcon />
      </a>
    </p>
  </div>;
}

function SubwayPanel({ language, m, places, arrival }: { language: string; m: M; places: TransitPlace[]; arrival?: Arrival }) {
  const [selected, setSelected] = useState<SubwayStation | null>(null);
  const [from, setFrom] = useState<SubwayStation | null>(null);
  const [to, setTo] = useState<SubwayStation | null>(null);
  const [route, setRoute] = useState<SubwayRoute | null>(null);
  const [online, setOnline] = useState<OnlinePaths | null>(null);
  const [scheduled, setScheduled] = useState<OdsayResult<ScheduledRoutes> | null>(null);
  const [holiday, setHoliday] = useState(false); // 이용자가 "오늘은 공휴일"이라고 고르면 휴일 시간표로 막차를 다시 본다
  const [departure, setDeparture] = useState("");
  const [departureConfirmed, setDepartureConfirmed] = useState(false);
  const airportFrom = from?.ko.startsWith("인천공항") ? "ICN" : from?.ko === "김포공항" ? "GMP" : undefined;
  const selectedDeparture = airportFrom ? departure : "";
  const beforeLanding = !!selectedDeparture && airportFrom === arrival?.airport && !!arrival?.datetime && Date.parse(`${selectedDeparture}:00+09:00`) < Date.parse(arrival.datetime);
  const [focusLine, setFocusLine] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Partial<Record<Field, PlaceNote>>>({});
  const [placeResult, setPlaceResult] = useState<{ field: Field; label: string; result: PlaceStations } | null>(null);
  const [placePending, startPlace] = useTransition();

  useEffect(() => { setDepartureConfirmed(false); }, [arrival?.datetime, airportFrom]);

  // 출발·도착이 모두 정해지면 바로 경로를 찾는다
  useEffect(() => {
    if (!from || !to || from.id === to.id) {
      setRoute(null);
      setOnline(null);
      setScheduled(null);
      return;
    }
    setRoute(subwayRoute(from.id, to.id));
    setOnline(null);
    setScheduled(null);
    if (selectedDeparture && !departureConfirmed) return;
    let active = true;
    startTransition(async () => {
      if (selectedDeparture) {
        const result = webEnabled
          ? await scheduledTransit(from.id, to.id, selectedDeparture, holiday, webOptions)
          : await scheduledTransitAction(from.id, to.id, selectedDeparture, holiday);
        if (active) setScheduled(result);
      } else {
        const result = webEnabled
          ? await transitPaths(from.id, to.id, language, holiday, webOptions)
          : await transitPathsAction(from.id, to.id, language, holiday);
        if (active) setOnline(result);
      }
    });
    return () => { active = false; };
  }, [from, to, language, holiday, selectedDeparture, departureConfirmed]);

  const choose = (field: Field, station: SubwayStation | null, note?: PlaceNote) => {
    setDepartureConfirmed(false);
    setNotes((current) => ({ ...current, [field]: note }));
    setPlaceResult(null);
    if (field === "from") setFrom(station);
    else setTo(station);
  };
  // 숙소·식당·입력한 장소를 지도에서 찾아 가까운 역 후보를 보여 준다 (좌표는 지도 검색 결과만 쓴다)
  const searchPlace = (field: Field, label: string, query: string) => {
    setPlaceResult(null);
    startPlace(async () => setPlaceResult({ field, label, result: await placeStationsAction(query, language) }));
  };
  const nextField = (): Field => (from ? "to" : "from");
  const swap = () => {
    setDepartureConfirmed(false);
    setFrom(to);
    setTo(from);
    setNotes({ from: notes.to, to: notes.from });
  };

  return (
    <div className="transit-panel">
      <StationSearch label={m.findStation} placeholder={m.findPh} language={language} m={m} onPick={setSelected} big />
      <SubwayMap route={route} selected={selected} focusLine={focusLine} language={language} m={m} onPick={(id) => setSelected(getStation(id) ?? null)} />
      {selected && (
        <StationCard
          station={selected}
          language={language}
          m={m}
          onFrom={() => choose("from", selected)}
          onTo={() => choose("to", selected)}
          onClose={() => setSelected(null)}
        />
      )}
      <ul className="subway-legend" aria-label={m.legend}>
        <li>
          <button type="button" aria-pressed={focusLine === null} onClick={() => setFocusLine(null)}>
            {m.allLines}
          </button>
        </li>
        {SUBWAY.lines.map((line) => (
          <li key={line.id}>
            <button type="button" aria-pressed={focusLine === line.id} onClick={() => setFocusLine(focusLine === line.id ? null : line.id)}>
              <LineBadge id={line.id} />
              {lineName(line, language)}
            </button>
          </li>
        ))}
      </ul>
      <p className="ag-source">
        <a href={SUBWAY.source.url} target="_blank" rel="noopener noreferrer">
          {fmt(m.source, { date: SUBWAY.fetchedAt })}
          <ExternalIcon />
        </a>
      </p>

      <section className="transit-form" aria-label={m.planTitle}>
        <p className="tips-col-title">{m.planTitle}</p>
        <div className="transit-fields">
          <StationSearch
            label={m.fromLabel}
            placeholder={m.stationPh}
            language={language}
            m={m}
            value={from}
            onPick={(station) => choose("from", station)}
            onPlace={(text) => searchPlace("from", text, text)}
          />
          <button type="button" className="button-ghost transit-swap" onClick={swap} aria-label={m.swap}>
            ⇅
          </button>
          <StationSearch
            label={m.toLabel}
            placeholder={m.stationPh}
            language={language}
            m={m}
            value={to}
            onPick={(station) => choose("to", station)}
            onPlace={(text) => searchPlace("to", text, text)}
          />
        </div>
        {airportFrom && (
          <div className="airport-departure">
            <label className="label">{m.airportDeparture}
              <input className="field" type="datetime-local" value={departure} onChange={(event) => { setDeparture(event.target.value); setDepartureConfirmed(false); }} />
            </label>
            {airportFrom === arrival?.airport && arrival.datetime && <p className="ag-note">{fmt(m.plannedLanding, { time: new Date(arrival.datetime).toLocaleString(language, { timeZone: "Asia/Seoul" }) })}</p>}
            {beforeLanding && <p className="ag-warn" role="status">{m.departureBeforeLanding}</p>}
            {selectedDeparture && <label className="ag-confirm"><input type="checkbox" checked={departureConfirmed} onChange={(event) => setDepartureConfirmed(event.target.checked)} />{m.departureConfirm}</label>}
            {selectedDeparture && <label className="ag-confirm"><input type="checkbox" checked={holiday} onChange={(event) => { setHoliday(event.target.checked); setDepartureConfirmed(false); }} />{m.scheduleHoliday}</label>}
          </div>
        )}
        <div className="transit-quick" role="group" aria-label={m.airports}>
          <span>{m.airports}</span>
          {AIRPORT_STATIONS.map(({ ko, short }) => {
            const station = SUBWAY.stations.find((s) => s.ko === ko);
            return station ? (
              <button key={ko} type="button" className="chip" onClick={() => choose(nextField(), station)} title={stationLabel(station, language)}>
                {short[language] ?? short.other}
              </button>
            ) : null;
          })}
        </div>
        {places.length > 0 && (
          <div className="transit-quick" role="group" aria-label={m.myPlaces}>
            <span>{m.myPlaces}</span>
            {places.map((place) => (
              <button key={place.label} type="button" className="chip" onClick={() => searchPlace(nextField(), place.label, place.query)}>
                {place.label}
              </button>
            ))}
          </div>
        )}
        {placePending && (
          <p className="ag-note" role="status">
            {m.placeLooking}
          </p>
        )}
        {placeResult && <PlaceCandidates result={placeResult} language={language} m={m} onPick={choose} />}
      </section>

      {route && from && to && <RouteDiagram route={route} language={language} m={m} notes={notes} />}
      {route && (
        <section className="transit-online" aria-live="polite">
          <p className="tips-col-title">{m.timesTitle}</p>
          {selectedDeparture && !departureConfirmed && <p className="ag-note" role="status">{m.departureConfirm}</p>}
          {selectedDeparture && scheduled && <ScheduledResult result={scheduled} departure={selectedDeparture} language={language} m={m} holiday={holiday} />}
          {pending && <p className="ag-note">…</p>}
          {!selectedDeparture && online && <OnlineResult result={online} language={language} m={m} holiday={holiday} onHoliday={setHoliday} />}
        </section>
      )}
    </div>
  );
}

// 역 찾기: 한국어·영어·일본어·중국어 이름(띄어쓰기·하이픈 무시)과 역 번호로 찾는다. 위·아래 화살표와 Enter로 고를 수 있다.
// onPlace가 있으면 역이 아닌 이름(호텔·식당 등)을 장소로 찾을 수 있게 한다
function StationSearch({
  label,
  placeholder,
  language,
  m,
  value,
  onPick,
  onPlace,
  big = false,
}: {
  label: string;
  placeholder: string;
  language: string;
  m: M;
  value?: SubwayStation | null;
  onPick: (station: SubwayStation) => void;
  onPlace?: (text: string) => void;
  big?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const editing = open || text !== "";
  const results = useMemo(() => (text.trim() ? findStations(text, 7) : []), [text]);
  const pick = (station: SubwayStation) => {
    onPick(station);
    setText("");
    setOpen(false);
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") setActive((i) => Math.min(results.length - 1, i + 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (event.key === "Enter") {
      event.preventDefault();
      if (results[active]) pick(results[active]);
      else if (onPlace && text.trim()) {
        onPlace(text.trim());
        setOpen(false);
      }
    } else if (event.key === "Escape") setOpen(false);
    else return;
    if (event.key.startsWith("Arrow")) event.preventDefault();
  };
  return (
    <div className={big ? "station-search is-big" : "station-search"}>
      <label className="label">
        {label}
        <input
          className="field"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          value={editing ? text : value ? stationLabel(value, language) : ""}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
      </label>
      {open && text.trim() && (
        <ul className="station-results" id={listId} role="listbox">
          {results.map((station, i) => (
            <li key={station.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(station)}>
                <span className="sr-lines">
                  {station.lines.map((id) => (
                    <LineBadge key={id} id={id} />
                  ))}
                </span>
                <span className="sr-name">
                  <strong>{stationName(station, language)}</strong>
                  {stationName(station, language) !== station.ko && <span lang="ko">{station.ko}</span>}
                </span>
                <span className="sr-codes tabular">{Object.values(station.codes ?? {}).join(" · ")}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="sr-empty">{m.noMatch}</li>}
          {onPlace && (
            <li>
              <button type="button" className="sr-place" onMouseDown={(e) => e.preventDefault()} onClick={() => (onPlace(text.trim()), setOpen(false))}>
                {fmt(m.searchPlace, { text: text.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// 고른 역의 정보: 화면 언어로 쓴 큰 이름과 표지판의 한국어(·영어) 이름, 노선별 역 번호, 출발·도착으로 쓰기
function StationCard({
  station,
  language,
  m,
  onFrom,
  onTo,
  onClose,
}: {
  station: SubwayStation;
  language: string;
  m: M;
  onFrom: () => void;
  onTo: () => void;
  onClose: () => void;
}) {
  const primary = stationName(station, language);
  return (
    <section className="station-card" aria-label={primary}>
      <header className="sc-head">
        <p className="sc-name">
          <strong>{primary}</strong>
          {/* 표지판의 한국어 이름, 화면 이름이 표지판 영어와 다르면 영어도 (예: Hôtel de ville → 시청 · City Hall) */}
          {primary !== station.ko && (
            <span>
              <span lang="ko">{station.ko}</span>
              {station.en && primary !== station.en && <span lang="en"> · {station.en}</span>}
            </span>
          )}
        </p>
        <button type="button" className="sc-close" onClick={onClose} aria-label={m.close}>
          ×
        </button>
      </header>
      <ul className="sc-lines">
        {station.lines.map((id) => {
          const line = getLine(id)!;
          return (
            <li key={id}>
              <LineBadge id={id} />
              <span>{lineName(line, language)}</span>
              {station.codes?.[id] && <span className="sc-code tabular" title={m.stationNo}>{station.codes[id]}</span>}
            </li>
          );
        })}
      </ul>
      {station.lines.length > 1 && <p className="ag-note">{m.transferStation}</p>}
      <div className="sc-actions">
        <button type="button" className="button" onClick={onFrom}>
          {m.startHere}
        </button>
        <button type="button" className="button-quiet" onClick={onTo}>
          {m.goHere}
        </button>
      </div>
    </section>
  );
}

function LineBadge({ id }: { id: string }) {
  const line = getLine(id);
  if (!line) return null;
  return (
    <span className="line-badge" style={{ "--line": line.colour } as React.CSSProperties} aria-hidden="true">
      {line.short}
    </span>
  );
}

// 지도 검색으로 찾은 장소 후보와 가까운 역. 같은 이름이 여럿이면 주소로 구분해 고르게 한다
function PlaceCandidates({
  result,
  language,
  m,
  onPick,
}: {
  result: { field: Field; label: string; result: PlaceStations };
  language: string;
  m: M;
  onPick: (field: Field, station: SubwayStation, note: PlaceNote) => void;
}) {
  const { status } = result.result;
  if (status !== "ok") {
    return (
      <p className="ag-warn" role="status">
        {status === "not_found" ? m.placeNotFound : status === "out_of_area" ? m.placeOutOfArea : m.placeError}
      </p>
    );
  }
  const candidates = result.result.status === "ok" ? result.result.candidates : [];
  return (
    <div className="place-candidates" role="group" aria-label={fmt(m.nearTitle, { place: result.label })}>
      {candidates.length > 1 && <p className="ag-note">{m.pickOne}</p>}
      {candidates.map((candidate, i) => (
        <div key={i} className="place-candidate">
          <p className="place-name">
            <strong>{candidate.label}</strong>
            {candidate.detail && <span className="ag-note"> · {candidate.detail}</span>}
          </p>
          <div className="transit-quick">
            {candidate.stations.map(({ id, meters }) => {
              const station = getStation(id);
              return station ? (
                <button key={id} type="button" className="chip" onClick={() => onPick(result.field, station, { label: candidate.label, meters })}>
                  <span className="chip-name">{stationLabel(station, language)}</span> <span className="transit-lines">{fmt(m.straight, { n: meters })}</span>
                </button>
              ) : null;
            })}
          </div>
        </div>
      ))}
      <p className="ag-note">{m.placeSource}</p>
    </div>
  );
}

// 방면: 실제 종착역 이름(한국어가 아닌 화면은 화면 언어 이름 (한국어))
function directionText(line: string, from: string, next: string, language: string, m: M) {
  const d = legDirection(line, from, next);
  if (d.kind === "loop") return d.clockwise ? m.innerCircle : m.outerCircle;
  if (!d.names.length) return "";
  const names = d.names.map((ko) => {
    const local = terminusName(ko, language);
    return local === ko ? ko : `${local} (${ko})`;
  });
  return fmt(m.toward, { names: names.join(" / ") });
}

// 경로를 한 줄 그림으로: 노선 색 막대 위에 탈 역 → (갈아탈 역) → 내릴 역. 방면은 표지판의 종착역 이름으로
function RouteDiagram({ route, language, m, notes }: { route: SubwayRoute; language: string; m: M; notes: Partial<Record<Field, PlaceNote>> }) {
  const [openLeg, setOpenLeg] = useState<number | null>(null);
  const name = (id: string) => {
    const s = getStation(id);
    return s ? stationLabel(s, language) : id;
  };
  const code = (id: string, line: string) => getStation(id)?.codes?.[line];
  return (
    <section className="transit-route" aria-label={m.tabRoute}>
      <p className="transit-summary">
        <strong>{fmt(m.stops, { n: route.stops })}</strong>
        <span>{route.transfers ? fmt(m.transfers, { n: route.transfers }) : m.noTransfers}</span>
      </p>
      {notes.from && <p className="transit-walk">{fmt(m.walkFrom, { place: notes.from.label, station: name(route.legs[0].from), n: notes.from.meters })}</p>}
      <ol className="route-diagram">
        {route.legs.map((leg, i) => {
          const line = getLine(leg.line)!;
          const lineLabel = lineName(line, language);
          const inner = leg.stations.slice(1, -1);
          return (
            <li key={i} className="rd-leg" style={{ "--line": line.colour } as React.CSSProperties}>
              <div className={i === 0 ? "rd-stop is-start" : "rd-stop is-transfer"}>
                <span className="rd-dot" aria-hidden="true" />
                <div>
                  <p className="rd-station">
                    {name(leg.from)}
                    {code(leg.from, leg.line) && <span className="sc-code tabular">{code(leg.from, leg.line)}</span>}
                  </p>
                  <p className="rd-action">{fmt(i === 0 ? m.board : m.transferAt, { line: lineLabel, station: name(leg.from) })}</p>
                </div>
              </div>
              <div className="rd-ride">
                <LineBadge id={leg.line} />
                <div>
                  <p>
                    <strong>{lineLabel}</strong> {directionText(leg.line, leg.stations[0], leg.stations[1], language, m)}
                  </p>
                  <p className="ag-note">
                    {fmt(m.next, { station: name(leg.next) })} · {fmt(m.rideStops, { n: leg.stops })}
                  </p>
                  {inner.length > 0 && (
                    <button type="button" className="rd-toggle" onClick={() => setOpenLeg(openLeg === i ? null : i)} aria-expanded={openLeg === i}>
                      {openLeg === i ? m.hideStops : fmt(m.showStops, { n: inner.length })}
                    </button>
                  )}
                  {openLeg === i && (
                    <ol className="rd-inner">
                      {inner.map((id) => (
                        <li key={id}>{name(id)}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        <li className="rd-leg is-end" style={{ "--line": getLine(route.legs.at(-1)!.line)!.colour } as React.CSSProperties}>
          <div className="rd-stop is-end">
            <span className="rd-dot" aria-hidden="true" />
            <div>
              <p className="rd-station">
                {name(route.legs.at(-1)!.to)}
                {code(route.legs.at(-1)!.to, route.legs.at(-1)!.line) && <span className="sc-code tabular">{code(route.legs.at(-1)!.to, route.legs.at(-1)!.line)}</span>}
              </p>
              <p className="rd-action transit-off">{fmt(m.getOff, { station: name(route.legs.at(-1)!.to) })}</p>
            </div>
          </div>
        </li>
      </ol>
      {notes.to && <p className="transit-walk">{fmt(m.walkTo, { place: notes.to.label, station: name(route.legs.at(-1)!.to), n: notes.to.meters })}</p>}
      <p className="ag-note">{m.limits}</p>
    </section>
  );
}

function OfficialLinks({ m }: { m: M }) {
  return (
    <p className="transit-official">
      <span>{m.officialTitle}</span>
      {OFFICIAL.map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
          {link.name}
          <ExternalIcon />
        </a>
      ))}
    </p>
  );
}

const STATUS_KEY = { unconfigured: "unconfigured", permission: "permission", limit: "limit", timeout: "timeout", error: "error", empty: "empty", too_close: "tooClose", out_of_area: "outOfArea" } as const;

// 교통 데이터의 한국어 역·노선 이름을 노선도 자료의 화면 언어 이름과 함께 보여 준다 (무료 요금제는 국문만 준다)
function stationText(name: string, language: string) {
  if (language === "ko") return name;
  const found = findStations(name);
  return found.length === 1 ? stationLabel(found[0], language) : name;
}
const lineKey = (name: string) => name.replace(/^수도권\s*/, "").replace(/[\s·]/g, "");
function lineText(name: string, language: string) {
  if (language === "ko") return name;
  const line = SUBWAY.lines.find((candidate) => lineKey(candidate.ko) === lineKey(name) || lineKey(candidate.ko) === `${lineKey(name)}선`);
  return line ? `${lineName(line, language)} · ${line.ko}` : name;
}
const clockTime = (iso: string, language: string) =>
  new Date(iso).toLocaleTimeString(language, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });

function LastTrain({ check, language, m, holiday, onHoliday }: { check: LastTrainCheck; language: string; m: M; holiday: boolean; onHoliday: (value: boolean) => void }) {
  const day = check.dayType === "weekday" ? m.dayWeekday : check.dayType === "saturday" ? m.daySaturday : m.dayHoliday;
  return (
    <div className={`last-train is-${check.status}`} role="status">
      <p className="last-train-head">{check.status === "ok" ? m.lastOk : check.status === "missed" ? m.lastMissed : m.lastUnknown}</p>
      <ul>
        {check.legs.map((leg, i) => (
          <li key={i}>
            {fmt(leg.status === "missed" ? m.lastLegMissed : leg.status === "ok" ? m.lastLeg : m.lastLegUnknown, {
              station: stationText(leg.from, language),
              line: lineText(leg.line, language),
              at: leg.reachAt,
              last: leg.last ?? "",
            })}
          </li>
        ))}
        {check.busNotChecked && <li>{m.busNotChecked}</li>}
      </ul>
      <p className="ag-note">{fmt(m.dayNote, { day })}</p>
      <p className="ag-note">{m.serviceDayUnverified}</p>
      <label className="ag-confirm">
        <input type="checkbox" checked={holiday} onChange={(e) => onHoliday(e.target.checked)} />
        {m.holidayToggle}
      </label>
    </div>
  );
}

function OnlineResult({ result, language, m, holiday, onHoliday }: { result: OnlinePaths; language: string; m: M; holiday: boolean; onHoliday: (value: boolean) => void }) {
  if (result.status !== "ok" || !result.data) {
    return (
      <>
        <p className={result.status === "unconfigured" ? "ag-note" : "ag-warn"} role="status">
          {fmt(m[STATUS_KEY[result.status as keyof typeof STATUS_KEY]], { code: result.code ?? "" })}
          {/* 원인 구분용 제공사 코드 (예: ApiKeyAuthFailed = 키·등록 IP 문제). 키 값은 담지 않는다 */}
          {result.code && (result.status === "permission" || result.status === "limit") && <span> ({result.code})</span>}
        </p>
        <OfficialLinks m={m} />
      </>
    );
  }
  return (
    <>
      <p className="ag-note">{m.nowOnly}</p>
      {language !== "ko" && result.data.some((path) => path.legs.some((leg) => leg.kind !== "walk" && /[가-힣]/.test(leg.from))) && (
        <p className="ag-note">{m.koreanOnly}</p>
      )}
      <ul className="transit-paths">
        {result.data.map((path, i) => (
          <li key={i}>
            <p className="transit-summary">
              <strong>{fmt(m.minutes, { n: path.minutes })}</strong>
              <span>{fmt(m.fare, { n: path.fare.toLocaleString() })}</span>
              <span>{path.transfers > 0 ? fmt(m.transfers, { n: path.transfers }) : m.noTransfers}</span>
              <span>{fmt(m.walk, { n: path.walkMeters })}</span>
            </p>
            <ol className="transit-path-legs">
              {path.legs.map((leg, j) =>
                leg.kind === "walk" && leg.meters === 0 ? null : leg.kind === "walk" ? (
                  <li key={j} className="is-walk">
                    {fmt(m.walk, { n: leg.meters })}
                  </li>
                ) : (
                  <li key={j}>
                    <strong>{leg.kind === "subway" ? lineText(leg.name, language) : leg.name}</strong> {leg.kind === "subway" ? stationText(leg.from, language) : leg.from} →{" "}
                    {leg.kind === "subway" ? stationText(leg.to, language) : leg.to} ({fmt(m.stops, { n: leg.stops })}
                    {leg.way ? ` · ${leg.kind === "subway" ? fmt(m.toward, { names: stationText(leg.way, language) }) : leg.way}` : ""})
                    {leg.exitIn && <span className="ag-note"> {fmt(m.exitIn, { n: leg.exitIn })}</span>}
                    {leg.exitOut && <span className="ag-note"> {fmt(m.exitOut, { n: leg.exitOut })}</span>}
                  </li>
                ),
              )}
            </ol>
            {path.lastTrain && <LastTrain check={path.lastTrain} language={language} m={m} holiday={holiday} onHoliday={onHoliday} />}
          </li>
        ))}
      </ul>
      {result.fetchedAt && <p className="ag-note">{fmt(m.checkedAt, { time: clockTime(result.fetchedAt, language) })}</p>}
      <OfficialLinks m={m} />
    </>
  );
}

function ScheduledResult({ result, departure, language, m, holiday }: { result: OdsayResult<ScheduledRoutes>; departure: string; language: string; m: M; holiday: boolean }) {
  const day = scheduledDeparture(departure, holiday)?.day;
  const dayLabel = day === 3 ? m.dayHoliday : day === 2 ? m.daySaturday : m.dayWeekday;
  const notice = result.data?.notice;
  return <>
    <p className="ag-note">{departure.replace("T", " ")} KST · {dayLabel}</p>
    <p className="ag-note">{m.scheduleNote}</p>
    {result.code === "service_day_unverified" ? <p className="ag-warn" role="status">{m.serviceDayUnverified}</p> :
      result.status === "empty" ? <p className="ag-warn" role="status">{m.scheduleEmpty}</p> :
      result.status !== "ok" ? <OnlineResult result={{ status: result.status, code: result.code }} language={language} m={m} holiday={holiday} onHoliday={() => {}} /> :
      <>
        {notice !== "normal" && <p className="ag-warn" role="status">{notice === "first" ? m.scheduleFirst : notice === "last" ? m.scheduleLast : m.scheduleUnknown}</p>}
        {/* 대체·미상 결과는 요청 시각 경로로 사용할 수 없으므로 경로 카드를 내보내지 않는다. */}
        {notice === "normal" && <ul className="transit-paths">{result.data?.paths.map((path, index) => <li key={index}>
          <p className="transit-summary"><strong>{path.departure} → {path.arrival} KST</strong><span>{fmt(m.minutes, { n: path.minutes })}</span><span>{fmt(m.fare, { n: path.fare.toLocaleString() })}</span><span>{path.transfers ? fmt(m.transfers, { n: path.transfers }) : m.noTransfers}</span></p>
          <ol className="transit-path-legs">{path.legs.map((leg, i) => <li key={i}>
            {leg.transfer ? <strong>{fmt(m.transfers, { n: 1 })}</strong> : <><strong>{lineText(leg.line, language)}</strong> {stationText(leg.from, language)} → {stationText(leg.to, language)}</>} · {leg.departure} → {leg.arrival}
            {leg.express && <span> · {m.scheduleExpress}</span>}
            {leg.transfer && <span> · {fmt(m.minutes, { n: leg.minutes })}</span>}
          </li>)}</ol>
        </li>)}</ul>}
        {result.fetchedAt && <p className="ag-note">{fmt(m.checkedAt, { time: new Date(result.fetchedAt).toLocaleString(language, { timeZone: "Asia/Seoul" }) })}</p>}
      </>}
    <OfficialLinks m={m} />
  </>;
}

// ── 지하철 지도 ───────────────────────────────────────────
type View = { x: number; y: number; w: number; h: number };
type LatLon = [number, number];
// public/transit/map.json (scripts/transit/fetch-map.ts): 실제 선로·한강·큰 도로·구 이름
type MapData = {
  tracks: { line: string; paths: LatLon[][] }[];
  river: LatLon[][];
  motorways?: LatLon[][];
  roads: LatLon[][];
  districts: { ko: string; en: string; ja?: string; zh?: string; lat: number; lon: number }[];
};

// 이름표 너비 어림: 한글·한자·가나는 글자 크기만큼, 라틴·태국 문자는 그 절반쯤
const WIDE = /[\u1100-\u11ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/;
const textWidth = (text: string, size: number) => [...text].reduce((w, ch) => w + size * (WIDE.test(ch) ? 0.95 : 0.56), 0);
const districtName = (d: MapData["districts"][number], language: string) =>
  language === "ko" ? d.ko : (language === "ja" && d.ja) || (language === "zh-CN" && d.zh) || d.en || d.ko;

let mapDataPromise: Promise<MapData | null> | null = null;
function useMapData(): MapData | null {
  const [data, setData] = useState<MapData | null>(null);
  useEffect(() => {
    mapDataPromise ??= fetch("/transit/map.json")
      .then((res) => (res.ok ? (res.json() as Promise<MapData>) : null))
      .catch(() => null);
    let alive = true;
    mapDataPromise.then((value) => alive && setData(value));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

// 화면은 배경 지도 범위(MAP_BBOX) 안에서만 움직인다
const [SOUTH, WEST, NORTH, EAST] = MAP_BBOX;
const NW = project(NORTH, WEST);
const SE = project(SOUTH, EAST);
const FULL = { x: NW.x, y: NW.y, width: SE.x - NW.x, height: SE.y - NW.y };
const ASPECT = 0.8; // 높이 / 너비
const POINTS = new Map(SUBWAY.stations.map((s) => [s.id, project(s.lat, s.lon)]));
const toPath = (line: LatLon[]) => line.map(([lat, lon], i) => {
  const p = project(lat, lon);
  return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}).join("");

function initialView(narrow = false): View {
  // 처음에는 여행자가 많이 다니는 서울 도심(홍대~잠실, 강북~강남)을 보여 준다. 휴대폰은 도심만 더 확대한다
  const c = project(37.548, 126.99);
  const half = narrow ? 0.07 : 0.135;
  const w = project(37.548, 126.99 + half).x - project(37.548, 126.99 - half).x;
  return { x: c.x - w / 2, y: c.y - (w * ASPECT) / 2, w, h: w * ASPECT };
}

// 여행자가 자주 찾는 역: 축소해도 이름을 먼저 붙인다
const HUBS = new Set(
  ["서울", "시청", "명동", "을지로입구", "종각", "광화문", "경복궁", "안국", "종로3가", "동대문역사문화공원", "동대문", "홍대입구", "신촌", "이태원", "용산", "여의도", "강남", "압구정", "잠실", "삼성", "고속터미널", "김포공항", "인천공항1터미널", "인천공항2터미널", "건대입구", "성수", "왕십리", "사당", "합정", "공덕"]
    .map((ko) => SUBWAY.stations.find((s) => s.ko === ko)?.id)
    .filter(Boolean) as string[],
);

// 멀리 축소했을 때 원과 이름을 붙이는 대표 역 (그 밖의 역은 노선만 보이게)
const OVERVIEW = new Set(
  ["인천공항1터미널", "김포공항", "서울", "홍대입구", "명동", "강남", "잠실", "여의도", "왕십리", "고속터미널", "종로3가"]
    .map((ko) => SUBWAY.stations.find((s) => s.ko === ko)?.id)
    .filter(Boolean) as string[],
);

// 지도 범위 밖(자료가 없는 빈 곳)이 보이지 않게 화면을 범위 안에 묶는다
// 가장 멀리 축소해도 인천공항부터 서울 동쪽까지만 (그보다 넓으면 노선이 작아져 알아보기 어렵다)
const MAX_W = Math.min(FULL.width, FULL.height / ASPECT, project(37.55, 127.3).x - project(37.55, 126.36).x);
function clampView(v: View): View {
  const w = Math.min(MAX_W, Math.max(FULL.width / 60, v.w));
  const h = w * ASPECT;
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const x = Math.min(FULL.x + FULL.width - w, Math.max(FULL.x, cx - w / 2));
  const y = Math.min(FULL.y + FULL.height - h, Math.max(FULL.y, cy - h / 2));
  return { x, y, w, h };
}

function SubwayMap({
  route,
  selected,
  focusLine,
  language,
  m,
  onPick,
}: {
  route: SubwayRoute | null;
  selected: SubwayStation | null;
  focusLine: string | null;
  language: string;
  m: M;
  onPick: (id: string) => void;
}) {
  const [view, setRawView] = useState<View>(() => clampView(initialView()));
  const viewRef = useRef(view);
  viewRef.current = view;
  const anim = useRef<number | null>(null);
  const setView = (next: View | ((v: View) => View)) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    setRawView((v) => clampView(typeof next === "function" ? next(v) : next));
  };
  // 버튼·역 고르기·경로 맞추기는 부드럽게 옮긴다 (움직임 줄이기 설정이면 바로)
  const animateTo = (target: View) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = viewRef.current;
    const goal = clampView(target);
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setRawView(goal);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 320);
      const e = 1 - Math.pow(1 - t, 3);
      setRawView({ x: from.x + (goal.x - from.x) * e, y: from.y + (goal.y - from.y) * e, w: from.w + (goal.w - from.w) * e, h: from.h + (goal.h - from.h) * e });
      anim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);
  const data = useMapData();

  const scaled = (v: View, factor: number, cx: number, cy: number): View => {
    const w = Math.min(MAX_W, Math.max(FULL.width / 60, v.w * factor));
    const h = w * ASPECT;
    return { x: v.x + (v.w - w) * cx, y: v.y + (v.h - h) * cy, w, h };
  };
  const zoom = (factor: number, cx = 0.5, cy = 0.5) => setView((v) => scaled(v, factor, cx, cy));
  const zoomSmooth = (factor: number) => animateTo(scaled(viewRef.current, factor, 0.5, 0.5));
  const pan = (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx * v.w, y: v.y + dy * v.h }));

  // 휠 확대: 페이지 스크롤을 막아야 해서 passive가 아닌 리스너를 직접 단다
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = 0;
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      pinch.current = Math.hypot(p.x - q.x, p.y - q.y);
    }
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2 && pinch.current) {
      const [p, q] = [...pointers.current.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      zoom(pinch.current / d);
      pinch.current = d;
      moved.current += 10;
      return;
    }
    const dx = next.x - last.x;
    const dy = next.y - last.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    if (moved.current > 4) event.currentTarget.setPointerCapture(event.pointerId);
    setView((v) => ({ ...v, x: v.x - (dx / rect.width) * v.w, y: v.y - (dy / rect.height) * v.h }));
  };
  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => pan(-0.15, 0),
      ArrowRight: () => pan(0.15, 0),
      ArrowUp: () => pan(0, -0.15),
      ArrowDown: () => pan(0, 0.15),
      "+": () => zoom(1 / 1.3),
      "=": () => zoom(1 / 1.3),
      "-": () => zoom(1.3),
    };
    if (keys[event.key]) {
      event.preventDefault();
      keys[event.key]();
    }
  };

  const routeStations = useMemo(() => new Set(route?.legs.flatMap((leg) => leg.stations) ?? []), [route]);
  const routeKeyStations = useMemo(() => new Set(route?.legs.flatMap((leg) => [leg.from, leg.to]) ?? []), [route]);
  const points = POINTS;
  // 노선: 실제 선로 모양. 지도 자료를 받기 전에는 역과 역을 곧게 잇는다
  const linePaths = useMemo(
    () =>
      SUBWAY.lines.map((line) => {
        const tracks = data?.tracks.find((t) => t.line === line.id)?.paths;
        const paths = tracks?.length
          ? tracks.map(toPath)
          : line.edges.map(([a, b]) => `M${points.get(a)!.x},${points.get(a)!.y}L${points.get(b)!.x},${points.get(b)!.y}`);
        return { line, d: paths.join("") };
      }),
    [data, points],
  );
  const roadPath = useMemo(() => (data ? data.roads.map(toPath).join("") : ""), [data]);
  const motorwayPath = useMemo(() => (data?.motorways ? data.motorways.map(toPath).join("") : ""), [data]);
  const riverPath = useMemo(() => (data ? data.river.map((line) => smoothPath(line.map(([lat, lon]) => project(lat, lon)))).join("") : ""), [data]);
  // 경로 강조: 지나는 역을 부드럽게 잇는다
  const routePaths = useMemo(
    () => (route?.legs ?? []).map((leg) => ({ colour: getLine(leg.line)!.colour, d: smoothPath(leg.stations.map((id) => points.get(id)!)) })),
    [route, points],
  );

  // 글자·점 크기는 화면 픽셀로 고정한다 (확대해도 글자가 커지거나 작아지지 않게)
  const [pxWidth, setPxWidth] = useState(700);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => setPxWidth(entry.contentRect.width || 700));
    observer.observe(svg);
    // 휴대폰처럼 좁은 화면이면 처음 보기를 도심 확대로 바꾼다 (이용자가 움직이기 전, 한 번만)
    if (svg.getBoundingClientRect().width < 520) setView(initialView(true));
    return () => observer.disconnect();
  }, []);
  const k = view.w / pxWidth; // 화면 1px = 지도 k 단위

  // 역을 고르면 그 역을 가운데에 두고 이름이 보일 만큼 확대한다
  useEffect(() => {
    if (!selected) return;
    const p = points.get(selected.id)!;
    const w = Math.min(viewRef.current.w, pxWidth * 0.75);
    animateTo({ x: p.x - w / 2, y: p.y - (w * ASPECT) / 2, w, h: w * ASPECT });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // 경로를 찾으면 경로 전체가 보이도록 화면을 맞춘다
  useEffect(() => {
    if (!route) return;
    const pts = route.legs.flatMap((leg) => leg.stations).map((id) => points.get(id)!).filter(Boolean);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    // 이름표가 들어갈 여백을 두고, 오른쪽 위 확대·축소 버튼 쪽은 더 넓게 비운다
    const [left, right, vertical] = [0.16, 0.3, 0.22];
    const spanX = Math.max(Math.max(...xs) - Math.min(...xs), FULL.width / 14);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const w = Math.max(spanX * (1 + left + right), (spanY * (1 + vertical * 2)) / ASPECT);
    const h = w * ASPECT;
    const x = Math.min(...xs) - (w - spanX) * (left / (left + right));
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    animateTo({ x, y: cy - h / 2, w, h });
  }, [route, points]);

  // 확대 정도에 따라 보여 주는 정보를 바꾼다 (화면 1px당 지도 단위 k로 판단)
  // 멀리(far): 고속도로만 연하게·노선 또렷하게·역 원은 작게·이름은 공항과 주요 관광역만
  // 보통: 간선도로·구 이름·환승역 / 가까이(zoomedIn): 일반 역과 모든 역 이름
  const far = k > 1.9;
  const showDots = k < 1.7;
  const zoomedIn = k < 0.8;
  const dimmed = (lineId: string) => (route ? true : focusLine !== null && focusLine !== lineId);
  const inView = (p: { x: number; y: number }) => p.x >= view.x && p.x <= view.x + view.w && p.y >= view.y && p.y <= view.y + view.h;
  // 역 이름표: 경로 역 → 노선이 많은 환승역 → 화면 가운데에 가까운 역 순으로, 겹치지 않는 것만 붙인다
  const labels = useMemo(() => {
    const fs = (far ? 12.5 : 11) * k;
    const sub = (far ? 10 : 9) * k;
    const center = { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    const candidates = SUBWAY.stations
      .filter((s) => inView(points.get(s.id)!))
      .filter((s) => s.id === selected?.id || routeStations.has(s.id) || (route ? false : far ? OVERVIEW.has(s.id) : zoomedIn || HUBS.has(s.id) || s.lines.length >= 2))
      .filter((s) => !focusLine || route || s.lines.includes(focusLine))
      .map((s) => {
        const p = points.get(s.id)!;
        // 경로에서는 출발·환승·도착 역을 먼저 붙인다
        const key = s.id === selected?.id ? 5000 : routeKeyStations.has(s.id) ? 2000 : routeStations.has(s.id) ? 1000 : HUBS.has(s.id) ? 500 : 0;
        const priority = key + s.lines.length * 10 - Math.hypot(p.x - center.x, p.y - center.y) / view.w;
        return { s, p, priority };
      })
      .sort((a, b) => b.priority - a.priority);
    // 이름표가 피해야 할 곳: 그려진 역 점과 오른쪽 위 확대·축소 버튼
    type Box = { x: number; y: number; w: number; h: number; id?: string; soft?: boolean };
    const placed: Box[] = [
      { x: view.x + view.w - 56 * k, y: view.y, w: 56 * k, h: 130 * k },
      // 흐리게 그린 역(경로 밖·고른 노선 밖)은 이름표가 덮어도 된다
      ...SUBWAY.stations
        // 멀리서는 대표 역 원끼리 몰려 있어 이름이 들어갈 자리가 없으니, 이름표끼리만 겹치지 않게 한다
        .filter(() => !far || route)
        .filter((s) => (route ? routeStations.has(s.id) : (s.lines.length > 1 || zoomedIn) && (!focusLine || s.lines.includes(focusLine))))
        .filter((s) => inView(points.get(s.id)!))
        .map((s) => {
          const p = points.get(s.id)!;
          const r = (s.lines.length > 1 || routeStations.has(s.id) ? 5.5 : 3.5) * k;
          // 경로의 중간 역 점은 출발·환승·도착 역 이름표가 덮어도 된다 (soft)
          return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2, id: s.id, soft: route ? !routeKeyStations.has(s.id) : false };
        }),
    ];
    // 고른 역(picked)은 역 점 위에도 놓을 수 있다 (환승역이 몰린 곳에서도 이름이 보이게). 다른 이름표·버튼은 피한다
    const hits = (box: Box, self: string, key: boolean, picked = false) =>
      placed.some(
        (b) => b.id !== self && !(key && b.soft) && !(picked && b.id) && box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y,
      );
    const out: { s: SubwayStation; x: number; y: number; fs: number; sub: number }[] = [];
    for (const { s, p } of candidates) {
      // 한국어가 아닌 화면: 화면 언어 이름을 크게, 표지판의 한국어 이름을 작게 아래에
      const local = stationName(s, language);
      const second = local !== s.ko ? s.ko : "";
      const w = Math.max(textWidth(local, fs), textWidth(second, sub)) + 4 * k;
      const h = (second ? fs + sub + 2 * k : fs) + 3 * k;
      const gap = 7 * k;
      // 오른쪽 → 왼쪽 → 위 → 아래 순으로, 화면 안에 들어가고 비어 있는 자리를 찾는다
      const spots: Box[] = [
        { x: p.x + gap, y: p.y - fs * 0.75, w, h },
        { x: p.x - gap - w, y: p.y - fs * 0.75, w, h },
        { x: p.x - w / 2, y: p.y - gap - h, w, h },
        { x: p.x - w / 2, y: p.y + gap, w, h },
        { x: p.x - 4 * k, y: p.y - gap - h, w, h },
        { x: p.x - 4 * k, y: p.y + gap, w, h },
        { x: p.x - w + 4 * k, y: p.y - gap - h, w, h },
        { x: p.x - w + 4 * k, y: p.y + gap, w, h },
      ];
      const margin = 3 * k;
      const inside = (box: Box) =>
        box.x >= view.x + margin && box.y >= view.y + margin && box.x + box.w <= view.x + view.w - margin && box.y + box.h <= view.y + view.h - margin;
      const spot = spots.find((box) => inside(box) && !hits(box, s.id, routeKeyStations.has(s.id), s.id === selected?.id));
      if (!spot) continue;
      placed.push(spot);
      out.push({ s, x: spot.x + 2 * k, y: spot.y + fs, fs, sub });
      if (out.length > 160) break;
    }
    return out;
  }, [view, k, route, routeStations, routeKeyStations, focusLine, zoomedIn, language, points, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="subway-wrap">
      <div className="subway-map">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          role="img"
          aria-label={`${m.tabMap}. ${m.mapHint}`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <rect x={FULL.x - FULL.width} y={FULL.y - FULL.height} width={FULL.width * 3} height={FULL.height * 3} className="subway-ground" />
          {/* 배경 지도: 한강·큰 도로·구 이름 (위치를 알아보기 위한 것) */}
          {riverPath && <path d={riverPath} className="subway-river" strokeWidth={34} />}
          {!far && roadPath && <path d={roadPath} className="subway-road" strokeWidth={zoomedIn ? 2.6 : 1.8} vectorEffect="non-scaling-stroke" />}
          {motorwayPath && <path d={motorwayPath} className={far ? "subway-road is-far" : "subway-road is-motorway"} strokeWidth={far ? 1.6 : zoomedIn ? 3.4 : 2.6} vectorEffect="non-scaling-stroke" />}
          {/* 구 이름은 경로를 볼 때·많이 축소했을 때는 숨긴다 (노선이 먼저 보이게) */}
          {!route && !far && data?.districts.map((d) => {
            const p = project(d.lat, d.lon);
            return inView(p) ? (
              <text key={d.ko} x={p.x} y={p.y} fontSize={11 * k} className="subway-district" textAnchor="middle">
                {districtName(d, language)}
              </text>
            ) : null;
          })}
          {/* 흰 테두리를 먼저 그려 겹치는 노선을 구분한다 */}
          {linePaths.map(({ line, d }) => (
            <path key={`c-${line.id}`} d={d} className="subway-casing" strokeWidth={far ? 5 : 6.5} vectorEffect="non-scaling-stroke" opacity={dimmed(line.id) ? 0.4 : 1} />
          ))}
          {linePaths.map(({ line, d }) => (
            <path key={line.id} d={d} className="subway-line" stroke={line.colour} strokeWidth={far ? 3.6 : zoomedIn ? 5 : 4} vectorEffect="non-scaling-stroke" opacity={dimmed(line.id) ? 0.18 : 1} />
          ))}
          {routePaths.map((leg, i) => (
            <g key={`r-${i}`}>
              <path d={leg.d} className="subway-casing" strokeWidth={11} vectorEffect="non-scaling-stroke" />
              <path d={leg.d} className="subway-line" stroke={leg.colour} strokeWidth={7} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {SUBWAY.stations.map((s) => {
            const p = points.get(s.id)!;
            const transfer = s.lines.length > 1;
            const onRoute = routeStations.has(s.id);
            if (!inView(p) || (!transfer && !onRoute && !showDots)) return null;
            // 멀리서는 대표 역·경로·고른 역만 원을 그린다
            if (far && !onRoute && s.id !== selected?.id && !OVERVIEW.has(s.id)) return null;
            const faded = route ? !onRoute : focusLine !== null && !s.lines.includes(focusLine);
            return (
              <g key={s.id} className="subway-station" opacity={faded ? 0.25 : 1} onClick={() => moved.current <= 4 && onPick(s.id)}>
                <circle cx={p.x} cy={p.y} r={11 * k} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={(far ? 4.2 : transfer ? (zoomedIn ? 5.4 : 4.4) : onRoute ? 4 : 2.8) * k}
                  fill="#fff"
                  stroke={transfer ? "#4b5560" : getLine(s.lines[0])?.colour}
                  strokeWidth={far ? 2 : 1.8}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{`${stationLabel(s, language)}${transfer ? ` (${m.transferStation})` : ""}`}</title>
                </circle>
              </g>
            );
          })}
          {selected && (
            <circle cx={points.get(selected.id)!.x} cy={points.get(selected.id)!.y} r={9 * k} className="subway-selected" vectorEffect="non-scaling-stroke" />
          )}
          {labels.map(({ s, x, y, fs, sub }) => (
            <text
              key={`l-${s.id}`}
              x={x}
              y={y}
              fontSize={fs}
              className={`subway-label${s.id === selected?.id || routeStations.has(s.id) ? " is-route" : ""}${far ? " is-far" : ""}`}
            >
              {stationName(s, language) === s.ko ? (
                <tspan lang="ko">{s.ko}</tspan>
              ) : (
                <>
                  <tspan>{stationName(s, language)}</tspan>
                  <tspan x={x} dy={sub + 2 * k} fontSize={sub} className="subway-label-sub" lang="ko">
                    {s.ko}
                  </tspan>
                </>
              )}
            </text>
          ))}
        </svg>
        <div className="subway-controls">
          <button type="button" onClick={() => zoomSmooth(1 / 1.5)} aria-label={m.zoomIn}>
            +
          </button>
          <button type="button" onClick={() => zoomSmooth(1.5)} aria-label={m.zoomOut}>
            −
          </button>
          <button type="button" onClick={() => animateTo(initialView(pxWidth < 520))} aria-label={m.reset}>
            ⟲
          </button>
        </div>
      </div>
      <p className="subway-hint">{route ? m.routeOnMap : m.mapHint}</p>
    </div>
  );
}
