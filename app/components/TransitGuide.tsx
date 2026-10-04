"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { busLaneDetailAction, busLanesAction, placeStationsAction, transitPathsAction, type PlaceStations } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { busRide, type BusLane, type BusLaneDetail, type OdsayResult, type TransitPath } from "@/lib/transit/odsay";
import type { LastTrainCheck } from "@/lib/transit/lasttrain";
import { SUBWAY, findStations, getLine, getStation, mapSize, project, subwayRoute, type SubwayRoute, type SubwayStation } from "@/lib/transit/subway";
import { ExternalIcon } from "./icons";

// 지하철·버스 안내. 노선도는 OSM(ODbL) 데이터로 앱 안에서 그리고, 시간·요금·버스는 ODsay가 연결됐을 때만 보여 준다.
// 위치 권한을 쓰지 않는다: 출발·도착은 이용자가 역 이름을 넣거나, 노선도에서 고르거나, 숙소·식당·입력한 장소의 가까운 역을 고른다.

type M = Messages["transit"];
const OFFICIAL = [
  { name: "Seoul Metro", url: "https://www.seoulmetro.co.kr/" },
  { name: "Seoul TOPIS", url: "https://topis.seoul.go.kr/" },
];
const AIRPORT_STATIONS = ["인천공항1터미널", "인천공항2터미널", "김포공항"];

const stationLabel = (s: SubwayStation, language: string) => (language === "ko" || !s.en ? s.ko : `${s.en} · ${s.ko}`);

// 여행 보드의 숙소·예약한 식당 (출발·도착 후보). query는 지도 검색에 넣을 이름·주소
export type TransitPlace = { label: string; query: string };
type Field = "from" | "to";
type PlaceNote = { label: string; meters: number };
type OnlinePaths = OdsayResult<(TransitPath & { lastTrain?: LastTrainCheck })[]>;

export function TransitGuide({ language, m, places = [] }: { language: string; m: M; places?: TransitPlace[] }) {
  const [tab, setTab] = useState<"subway" | "bus">("subway");
  return (
    <section className="transit" aria-label={m.title}>
      <p className="transit-area">{m.area}</p>
      <div className="ag-tabs is-two" role="tablist" aria-label={m.title}>
        {(["subway", "bus"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "ag-tab is-on" : "ag-tab"} onClick={() => setTab(value)}>
            {value === "subway" ? m.tabMap : m.tabBus}
          </button>
        ))}
      </div>
      {tab === "subway" ? <SubwayPanel language={language} m={m} places={places} /> : <BusPanel language={language} m={m} />}
    </section>
  );
}

function SubwayPanel({ language, m, places }: { language: string; m: M; places: TransitPlace[] }) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [from, setFrom] = useState<SubwayStation | null>(null);
  const [to, setTo] = useState<SubwayStation | null>(null);
  const [choices, setChoices] = useState<{ field: "from" | "to"; list: SubwayStation[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<SubwayRoute | null>(null);
  const [online, setOnline] = useState<OnlinePaths | null>(null);
  const [focusLine, setFocusLine] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [field, setField] = useState<Field>("from");
  const [notes, setNotes] = useState<Partial<Record<Field, PlaceNote>>>({});
  const [placeResult, setPlaceResult] = useState<{ field: Field; label: string; result: PlaceStations } | null>(null);
  const [placePending, startPlace] = useTransition();
  const [failedText, setFailedText] = useState<{ field: Field; text: string } | null>(null);

  // 숙소·식당·입력한 장소를 지도에서 찾아 가까운 역 후보를 보여 준다 (좌표는 지도 검색 결과만 쓴다)
  const searchPlace = (target: Field, label: string, query: string) => {
    setField(target);
    setError(null);
    setFailedText(null);
    setPlaceResult(null);
    startPlace(async () => setPlaceResult({ field: target, label, result: await placeStationsAction(query, language) }));
  };
  const nextField = (): Field => (field === "to" || fromText ? "to" : "from");

  const resolve = (text: string, picked: SubwayStation | null, field: "from" | "to") => {
    if (picked && stationLabel(picked, language) === text) return picked;
    // 자동 완성으로 고른 "English · 한국어" 표기는 한국어 이름으로 찾는다
    const found = findStations(text.includes(" · ") ? text.split(" · ").pop()! : text);
    if (found.length === 1) return found[0];
    if (found.length > 1) setChoices({ field, list: found });
    return null;
  };

  const run = (a: SubwayStation, b: SubwayStation) => {
    setError(null);
    setChoices(null);
    setRoute(subwayRoute(a.id, b.id));
    setOnline(null);
    startTransition(async () => setOnline(await transitPathsAction(a.id, b.id, language)));
  };

  const find = () => {
    setPlaceResult(null);
    setFailedText(null);
    const a = resolve(fromText, from, "from");
    const b = a ? resolve(toText, to, "to") : null;
    if (!a || !b) {
      const failed: Field = a ? "to" : "from";
      const text = failed === "to" ? toText : fromText;
      if (!findStations(text).length) {
        setError(m.noStation);
        if (text.trim()) setFailedText({ field: failed, text: text.trim() });
      }
      return;
    }
    setFrom(a);
    setTo(b);
    run(a, b);
  };

  const pick = (field: Field, station: SubwayStation, note?: PlaceNote) => {
    const label = stationLabel(station, language);
    setNotes((current) => ({ ...current, [field]: note }));
    setPlaceResult(null);
    setFailedText(null);
    if (field === "from") {
      setFrom(station);
      setFromText(label);
    } else {
      setTo(station);
      setToText(label);
    }
    setChoices(null);
    setError(null);
  };

  // 노선도에서 역을 누르면 비어 있는 칸부터 채운다
  const pickFromMap = (id: string) => {
    const station = getStation(id);
    if (!station) return;
    pick(!from || (from && to) ? "from" : "to", station);
    if (from && to) {
      setTo(null);
      setToText("");
      setRoute(null);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setFromText(toText);
    setToText(fromText);
    setNotes({ from: notes.to, to: notes.from });
  };

  return (
    <div className="transit-panel">
      <SubwayMap route={route} focusLine={focusLine} language={language} m={m} onPick={pickFromMap} />
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
              {language === "ko" ? line.ko : line.en}
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

      <form
        className="transit-form"
        onSubmit={(event) => {
          event.preventDefault();
          find();
        }}
      >
        <p className="tips-col-title">{m.tabRoute}</p>
        <datalist id="subway-stations">
          {SUBWAY.stations.map((s) => (
            <option key={s.id} value={stationLabel(s, language)} />
          ))}
        </datalist>
        <div className="transit-fields">
          <label className="label">
            {m.from}
            <input
              className="field"
              list="subway-stations"
              value={fromText}
              placeholder={m.stationPh}
              onFocus={() => setField("from")}
              onChange={(e) => {
                setFromText(e.target.value);
                setNotes((current) => ({ ...current, from: undefined }));
                setPlaceResult(null);
              }}
            />
          </label>
          <button type="button" className="button-ghost transit-swap" onClick={swap} aria-label={m.swap}>
            ⇅
          </button>
          <label className="label">
            {m.to}
            <input
              className="field"
              list="subway-stations"
              value={toText}
              placeholder={m.stationPh}
              onFocus={() => setField("to")}
              onChange={(e) => {
                setToText(e.target.value);
                setNotes((current) => ({ ...current, to: undefined }));
                setPlaceResult(null);
              }}
            />
          </label>
        </div>
        <div className="transit-quick" role="group" aria-label={m.airports}>
          <span>{m.airports}</span>
          {AIRPORT_STATIONS.map((ko) => {
            const station = SUBWAY.stations.find((s) => s.ko === ko);
            return station ? (
              <button key={ko} type="button" className="chip" onClick={() => pick(fromText ? "to" : "from", station)}>
                {stationLabel(station, language)}
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
        {choices && (
          <div className="transit-choices" role="group" aria-label={m.pickOne}>
            <p className="ag-note">{m.pickOne}</p>
            {choices.list.map((s) => (
              <button key={s.id} type="button" className="chip" onClick={() => pick(choices.field, s)}>
                {stationLabel(s, language)} <span className="transit-lines">{s.lines.map((id) => getLine(id)?.short).join("·")}</span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="show-error" role="alert">
            {error}
          </p>
        )}
        {failedText && (
          <button type="button" className="chip" onClick={() => searchPlace(failedText.field, failedText.text, failedText.text)}>
            {fmt(m.searchPlace, { text: failedText.text })}
          </button>
        )}
        {placePending && (
          <p className="ag-note" role="status">
            {m.placeLooking}
          </p>
        )}
        {placeResult && <PlaceCandidates result={placeResult} language={language} m={m} onPick={pick} />}
        <button type="submit" className="button">
          {m.find}
        </button>
      </form>

      {route && from && to && <RouteList route={route} language={language} m={m} notes={notes} />}
      {route && (
        <section className="transit-online" aria-live="polite">
          <p className="tips-col-title">{m.timesTitle}</p>
          {pending && <p className="ag-note">…</p>}
          {online && <OnlineResult result={online} language={language} m={m} />}
        </section>
      )}
    </div>
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

function RouteList({ route, language, m, notes }: { route: SubwayRoute; language: string; m: M; notes: Partial<Record<Field, PlaceNote>> }) {
  const name = (id: string) => {
    const s = getStation(id);
    return s ? stationLabel(s, language) : id;
  };
  return (
    <section className="transit-route" aria-label={m.tabRoute}>
      <p className="transit-summary">
        <strong>{fmt(m.stops, { n: route.stops })}</strong>
        <span>{route.transfers ? fmt(m.transfers, { n: route.transfers }) : m.noTransfers}</span>
      </p>
      {notes.from && <p className="transit-walk">{fmt(m.walkFrom, { place: notes.from.label, station: name(route.legs[0].from), n: notes.from.meters })}</p>}
      <ol className="transit-legs">
        {route.legs.map((leg, i) => {
          const line = getLine(leg.line)!;
          return (
            <li key={i} style={{ "--line": line.colour } as React.CSSProperties}>
              <LineBadge id={leg.line} />
              <div>
                <p>
                  {fmt(i === 0 ? m.board : m.transferAt, { line: language === "ko" ? line.ko : line.en, station: name(leg.from) })}
                  {i > 0 && ` → ${language === "ko" ? line.ko : line.en}`}
                </p>
                <p className="ag-note">
                  {fmt(m.next, { station: name(leg.next) })} · {fmt(m.stops, { n: leg.stops })}
                </p>
                {i === route.legs.length - 1 && <p className="transit-off">{fmt(m.getOff, { station: name(leg.to) })}</p>}
              </div>
            </li>
          );
        })}
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

const STATUS_KEY = { unconfigured: "unconfigured", permission: "permission", timeout: "timeout", error: "error", empty: "empty", too_close: "tooClose", out_of_area: "outOfArea" } as const;

// 교통 데이터의 한국어 역·노선 이름을 노선도 자료의 영문 이름과 함께 보여 준다 (무료 요금제는 국문만 준다)
function stationText(name: string, language: string) {
  if (language === "ko") return name;
  const found = findStations(name);
  return found.length === 1 ? stationLabel(found[0], language) : name;
}
const lineKey = (name: string) => name.replace(/^수도권\s*/, "").replace(/[\s·]/g, "");
function lineText(name: string, language: string) {
  if (language === "ko") return name;
  const line = SUBWAY.lines.find((candidate) => lineKey(candidate.ko) === lineKey(name) || lineKey(candidate.ko) === `${lineKey(name)}선`);
  return line ? `${line.en} · ${line.ko}` : name;
}
const clockTime = (iso: string, language: string) =>
  new Date(iso).toLocaleTimeString(language, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });

function LastTrain({ check, language, m }: { check: LastTrainCheck; language: string; m: M }) {
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
    </div>
  );
}

function OnlineResult({ result, language, m }: { result: OnlinePaths; language: string; m: M }) {
  if (result.status !== "ok" || !result.data) {
    return (
      <>
        <p className={result.status === "unconfigured" ? "ag-note" : "ag-warn"} role="status">
          {fmt(m[STATUS_KEY[result.status as keyof typeof STATUS_KEY]], { code: result.code ?? "" })}
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
                    {leg.way ? ` · ${leg.way}` : ""})
                    {leg.exitIn && <span className="ag-note"> {fmt(m.exitIn, { n: leg.exitIn })}</span>}
                    {leg.exitOut && <span className="ag-note"> {fmt(m.exitOut, { n: leg.exitOut })}</span>}
                  </li>
                ),
              )}
            </ol>
            {path.lastTrain && <LastTrain check={path.lastTrain} language={language} m={m} />}
          </li>
        ))}
      </ul>
      {result.fetchedAt && <p className="ag-note">{fmt(m.checkedAt, { time: clockTime(result.fetchedAt, language) })}</p>}
      <OfficialLinks m={m} />
    </>
  );
}

// ── 노선도 ───────────────────────────────────────────────
type View = { x: number; y: number; w: number; h: number };
const FULL = mapSize();
const ASPECT = 0.8; // 높이 / 너비
function initialView(): View {
  // 처음에는 서울 도심을 보여 준다 (공항은 끌어서 서쪽으로)
  const a = project(37.7, 126.82);
  const b = project(37.44, 127.16);
  const w = b.x - a.x;
  return { x: a.x, y: a.y + (b.y - a.y - w * ASPECT) / 2, w, h: w * ASPECT };
}

function SubwayMap({ route, focusLine, language, m, onPick }: { route: SubwayRoute | null; focusLine: string | null; language: string; m: M; onPick: (id: string) => void }) {
  const [view, setView] = useState<View>(initialView);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);

  const zoom = (factor: number, cx = 0.5, cy = 0.5) =>
    setView((v) => {
      const w = Math.min(FULL.width * 1.1, Math.max(FULL.width / 40, v.w * factor));
      const h = w * ASPECT;
      return { x: v.x + (v.w - w) * cx, y: v.y + (v.h - h) * cy, w, h };
    });
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

  const routeEdges = useMemo(() => {
    const set = new Set<string>();
    for (const leg of route?.legs ?? []) for (let i = 1; i < leg.stations.length; i++) set.add(`${leg.line}:${[leg.stations[i - 1], leg.stations[i]].sort().join("-")}`);
    return set;
  }, [route]);
  const routeStations = useMemo(() => new Set(route?.legs.flatMap((leg) => leg.stations) ?? []), [route]);
  const points = useMemo(() => new Map(SUBWAY.stations.map((s) => [s.id, project(s.lat, s.lon)])), []);

  // 경로를 찾으면 경로 전체가 보이도록 화면을 맞춘다
  useEffect(() => {
    if (!route) return;
    const pts = route.legs.flatMap((leg) => leg.stations).map((id) => points.get(id)!).filter(Boolean);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 0.18;
    const width = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) / ASPECT, FULL.width / 12);
    const w = width * (1 + pad * 2);
    const h = w * ASPECT;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    // 오른쪽 위 확대·축소 버튼에 경로 끝이 가리지 않게 화면을 조금 오른쪽으로 민다
    setView({ x: cx - w / 2 + w * 0.08, y: cy - h / 2, w, h });
  }, [route, points]);

  const unit = view.w / 100; // 화면 너비의 1%
  const showAllLabels = view.w < FULL.width / 9;
  const showTransferLabels = view.w < FULL.width / 3.2;
  const dimmed = (lineId: string) => (route ? true : focusLine !== null && focusLine !== lineId);

  return (
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
        <rect x={-FULL.width} y={-FULL.height} width={FULL.width * 3} height={FULL.height * 3} className="subway-ground" />
        {SUBWAY.lines.map((line) => (
          <g key={line.id} stroke={line.colour} strokeLinecap="round" opacity={dimmed(line.id) ? 0.18 : 1}>
            {line.edges.map(([a, b]) => {
              const p = points.get(a)!;
              const q = points.get(b)!;
              return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={3} vectorEffect="non-scaling-stroke" />;
            })}
          </g>
        ))}
        {route &&
          SUBWAY.lines.map((line) => (
            <g key={`r-${line.id}`} stroke={line.colour} strokeLinecap="round">
              {line.edges
                .filter(([a, b]) => routeEdges.has(`${line.id}:${[a, b].sort().join("-")}`))
                .map(([a, b]) => {
                  const p = points.get(a)!;
                  const q = points.get(b)!;
                  return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={7} vectorEffect="non-scaling-stroke" />;
                })}
            </g>
          ))}
        {SUBWAY.stations.map((s) => {
          const p = points.get(s.id)!;
          const transfer = s.lines.length > 1;
          const onRoute = routeStations.has(s.id);
          const faded = route ? !onRoute : focusLine !== null && !s.lines.includes(focusLine);
          const label = showAllLabels || (showTransferLabels && transfer) || onRoute;
          return (
            <g
              key={s.id}
              className="subway-station"
              opacity={faded ? 0.3 : 1}
              onClick={() => moved.current <= 4 && onPick(s.id)}
            >
              <circle cx={p.x} cy={p.y} r={unit * 1.4} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={transfer ? unit * 0.55 : unit * 0.32}
                fill="#fff"
                stroke={transfer ? "#14202e" : getLine(s.lines[0])?.colour}
                strokeWidth={transfer ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${s.ko}${s.en ? ` · ${s.en}` : ""}${transfer ? ` (${m.transferStation})` : ""}`}</title>
              </circle>
              {label && (
                <text x={p.x + unit * 0.8} y={p.y - unit * 0.5} fontSize={unit * 1.6} className="subway-label">
                  <tspan lang="ko">{s.ko}</tspan>
                  {language !== "ko" && s.en && (
                    <tspan x={p.x + unit * 0.8} dy={unit * 1.5} fontSize={unit * 1.2}>
                      {s.en}
                    </tspan>
                  )}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="subway-controls">
        <button type="button" onClick={() => zoom(1 / 1.4)} aria-label={m.zoomIn}>
          +
        </button>
        <button type="button" onClick={() => zoom(1.4)} aria-label={m.zoomOut}>
          −
        </button>
        <button type="button" onClick={() => setView(initialView())} aria-label={m.reset}>
          ⟲
        </button>
      </div>
      <p className="subway-hint">{route ? m.routeOnMap : m.mapHint}</p>
    </div>
  );
}

// ── 버스 ───────────────────────────────────────────────
function BusPanel({ language, m }: { language: string; m: M }) {
  const [busNo, setBusNo] = useState("");
  const [lanes, setLanes] = useState<OdsayResult<BusLane[]> | null>(null);
  const [detail, setDetail] = useState<OdsayResult<BusLaneDetail> | null>(null);
  const [board, setBoard] = useState<number | null>(null);
  const [alight, setAlight] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const search = () => {
    if (!busNo.trim()) return;
    setDetail(null);
    setBoard(null);
    setAlight(null);
    startTransition(async () => setLanes(await busLanesAction(busNo, language)));
  };
  const open = (busID: number) => {
    setBoard(null);
    setAlight(null);
    startTransition(async () => setDetail(await busLaneDetailAction(busID, language)));
  };

  const data = detail?.status === "ok" ? detail.data : undefined;
  const ride = data && board !== null && alight !== null ? busRide(data, board, alight) : null;
  const stopName = (idx: number | null) => data?.stops.find((s) => s.idx === idx)?.name ?? "";

  return (
    <div className="transit-panel">
      <form
        className="transit-form is-bus"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label className="label">
          {m.busNo}
          <input className="field" value={busNo} inputMode="text" placeholder={m.busPh} onChange={(e) => setBusNo(e.target.value)} />
        </label>
        <button type="submit" className="button" disabled={pending}>
          {m.busFind}
        </button>
      </form>
      {lanes && lanes.status !== "ok" && (
        <>
          <p className={lanes.status === "unconfigured" ? "ag-note" : "ag-warn"} role="status">
            {lanes.status === "unconfigured" ? m.busUnconfigured : fmt(m[STATUS_KEY[lanes.status as keyof typeof STATUS_KEY]], { code: lanes.code ?? "" })}
          </p>
          <OfficialLinks m={m} />
        </>
      )}
      {lanes?.status === "ok" && lanes.data && (
        <div className="transit-choices" role="group" aria-label={m.busPick}>
          <p className="ag-note">{m.busPick}</p>
          {/* 같은 번호가 여러 도시에 있으면 서울 노선을 먼저 보여 준다 (지원 범위가 서울·수도권이라서) */}
          {[...lanes.data].sort((a, b) => Number(b.city === "서울") - Number(a.city === "서울")).map((lane) => (
            <button key={lane.busID} type="button" className="chip" onClick={() => open(lane.busID)}>
              <strong>{lane.busNo}</strong> {lane.from} ↔ {lane.to} <span className="transit-lines">{lane.city}</span>
            </button>
          ))}
        </div>
      )}
      {detail && detail.status !== "ok" && (
        <p className="ag-warn" role="status">
          {fmt(m[STATUS_KEY[detail.status as keyof typeof STATUS_KEY]], { code: detail.code ?? "" })}
        </p>
      )}
      {data && (
        <section className="bus-stops" aria-label={m.busStops}>
          <p className="tips-col-title">
            {data.busNo} · {m.busStops}
          </p>
          <p className="ag-note">{m.busSide}</p>
          {ride && (
            <p className={ride.ok ? "transit-summary" : "ag-warn"} role="status">
              {ride.ok ? fmt(m.busRide, { n: ride.stops, from: stopName(board), to: stopName(alight) }) : m.busWrong}
              {ride.ok && ride.passesTurn && <span className="ag-warn">{m.busTurn}</span>}
            </p>
          )}
          <ol className="bus-stop-list">
            {data.stops.map((stop) => {
              const inRide = ride?.ok && board !== null && alight !== null && stop.idx >= board && stop.idx <= alight;
              return (
                <li key={stop.idx} className={inRide ? "is-ride" : undefined}>
                  <span className="bus-stop-name">
                    {stop.name}
                    <span className="ag-note">
                      {stop.arsID && stop.arsID !== "0" ? ` ARS ${stop.arsID}` : ""}
                      {stop.direction === 1 ? ` · ${m.busDown}` : stop.direction === 2 ? ` · ${m.busUp}` : ""}
                      {stop.nonstop ? ` · ${m.busNonstop}` : ""}
                    </span>
                  </span>
                  {!stop.nonstop && (
                    <span className="bus-stop-actions">
                      <button type="button" aria-pressed={board === stop.idx} onClick={() => setBoard(stop.idx)}>
                        {m.busBoard}
                      </button>
                      <button type="button" aria-pressed={alight === stop.idx} onClick={() => setAlight(stop.idx)}>
                        {m.busAlight}
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {detail?.fetchedAt && <p className="ag-note">{fmt(m.checkedAt, { time: clockTime(detail.fetchedAt, language) })}</p>}
        </section>
      )}
    </div>
  );
}
