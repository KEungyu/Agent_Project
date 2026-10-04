import { addItinerary, saveStay, saveTrip } from "@/app/actions";
import type { Stay, TripBoard } from "@/lib/board/types";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { formatDate, formatKst, formatTimeKst, kstDate, kstMinutesOfDay, toLocalInput } from "@/lib/time";
import { cityKo } from "@/lib/i18n/places";
import { localCityName } from "@/lib/map/route";
import { airportTransfers, isLateHour } from "@/lib/transport/airport";
import { formatDuration } from "@/lib/transport/format";
import { getMessages } from "@/lib/i18n/messages";
import { ExecutionBadge } from "./ExecutionBadge";
import { BedIcon, BusIcon, CardIcon, HotelIcon, PhoneIcon, PinIcon, ExternalIcon, SuitcaseIcon, TaxiIcon, TrainIcon, ClockIcon, CoinsIcon, MoonIcon, PlaneIcon, ReceiptIcon, SimIcon, TerminalIcon } from "./icons";
import { DateField, DateTimeField } from "./DateField";
import { SignTitle } from "./SignTitle";
import { KoreaMap } from "./KoreaMap";
import { Checklist } from "./Checklist";
import { ShowCards, ShowTaxiButton } from "./ShowCards";
import { TaxiCalculator } from "./TaxiCalculator";
import { TransportPlanner } from "./TransportPlanner";
import { buildChecklist } from "@/lib/checklist";
import { TripRoute } from "./TripRoute";
import { AirportGuide } from "./AirportGuide";
import { TransitGuide } from "./TransitGuide";
import { overlappingStays } from "@/lib/board/overlap";
import type { LanguageCode } from "@/lib/i18n/languages";

type Props = { board: TripBoard | null; m: Messages; language: string };

export function TripPanel({ board, m, language }: Props) {
  const b = m.board;
  return (
    <section className="panel" aria-labelledby="trip-heading">
      <SignTitle id="trip-heading" ko="여행 보드" text={b.title} icon={<SuitcaseIcon />} />
      <TripPass board={board} m={m} language={language} />
      <Checklist items={buildChecklist(board)} m={m.checklist} />

      <div className="sign">
        <SignTitle as="h3" ko="도시 일정" text={b.cities} />
        <TripRoute board={board} m={m} locale={language} />
        <TransportPlanner itinerary={board?.itinerary ?? []} language={language} m={m} />
        <form action={addItinerary} className="inline-form">
          <DateField name="date" required language={language} labels={m.date} ariaLabel={b.date} />
          <input className="field" name="city" required placeholder={b.cityPlaceholder} aria-label={b.city} />
          <button type="submit" className="button-quiet">
            {b.addCity}
          </button>
        </form>
        <KoreaMap itinerary={board?.itinerary ?? []} arrivalAirport={board?.arrival?.airport} language={language as LanguageCode} m={m} />
      </div>

      <div className="sign">
        <SignTitle as="h3" ko="지하철·버스" text={m.transit.title} />
        <TransitGuide language={language} m={m.transit} places={transitPlaces(board)} />
      </div>

      <div className="sign">
        <SignTitle as="h3" ko="항공편" text={b.flights} />
        <div className="flight-cards">
          <FlightCard
            code={board?.arrival?.airport}
            label={b.arrival}
            when={board?.arrival?.datetime}
            flightNo={board?.arrival?.flight_no}
            terminal={board?.arrival?.terminal}
            m={m}
            language={language}
          />
          <FlightCard code={board?.departure?.airport} label={b.departure} when={board?.departure?.datetime} flightNo={board?.departure?.flight_no} m={m} language={language} />
        </div>
        <AirportTransfer board={board} m={m} language={language} />
        <AirportTips board={board} m={m} />
        <AirportGuide
          arrivalAirport={board?.arrival?.airport}
          arrivalTerminal={board?.arrival?.terminal}
          departureAirport={board?.departure?.airport}
          arrivalFlightNo={board?.arrival?.flight_no}
          departureFlightNo={board?.departure?.flight_no}
          language={language as LanguageCode}
          m={m.airportGuide}
          airports={m.airports}
          hotelUpdate={<HotelArrivalUpdate board={board} m={m} language={language} />}
        />
        {/* 항공편이 비어 있으면 입력 폼을 펼쳐 둔다 */}
        <details className="editor" open={!board?.arrival && !board?.departure}>
          <summary className="button-ghost">
            <EditIcon />
            {b.edit}
          </summary>
          <form action={saveTrip} className="editor-form">
            <div className="grid-2">
              <div className="label">
                {b.arrival}
                <DateTimeField name="arrival_datetime" defaultValue={toLocalInput(board?.arrival?.datetime)} language={language} labels={m.date} ariaLabel={b.arrival} />
              </div>
              <label className="label">
                {b.airport}
                <select className="field" name="arrival_airport" defaultValue={board?.arrival?.airport ?? "ICN"}>
                  {(["ICN", "GMP", "PUS", "CJU"] as const).map((code) => (
                    <option key={code} value={code}>
                      {m.airports[code]} ({code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {b.terminal}
                <select className="field" name="arrival_terminal" defaultValue={board?.arrival?.terminal ?? ""}>
                  <option value="">{b.noTerminal}</option>
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                </select>
              </label>
              <label className="label">
                {b.flightNo}
                <input className="field" name="arrival_flight_no" defaultValue={board?.arrival?.flight_no ?? ""} placeholder="KE908" />
              </label>
              <div className="label">
                {b.departure}
                <DateTimeField name="departure_datetime" defaultValue={toLocalInput(board?.departure?.datetime)} language={language} labels={m.date} ariaLabel={b.departure} />
              </div>
              <label className="label">
                {b.airport}
                <select className="field" name="departure_airport" defaultValue={board?.departure?.airport ?? "ICN"}>
                  {(["ICN", "GMP", "PUS", "CJU"] as const).map((code) => (
                    <option key={code} value={code}>
                      {m.airports[code]} ({code})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="button">
              {b.saveFlights}
            </button>
          </form>
        </details>
      </div>

      <div className="sign">
        <SignTitle as="h3" ko="숙소" text={b.stays} />
        {/* 날짜가 겹치는 숙소 (중복 예약인지 일정이 바뀐 것인지는 앱이 단정하지 않는다) */}
        {overlappingStays(board?.stays ?? []).map((overlap) => (
          <p key={`${overlap.a}-${overlap.b}`} className="ag-warn" role="status">
            {fmt(b.stayOverlap, { a: overlap.a, b: overlap.b, from: formatDate(overlap.from, language), to: formatDate(overlap.to, language) })}
          </p>
        ))}
        {board?.stays.length ? null : (
          <div className="stay-empty">
            <span className="stay-empty-icon" aria-hidden="true">
              <HotelIcon />
            </span>
            <p>{b.noStays}</p>
          </div>
        )}
        {board?.stays.map((stay, i) => (
          <article key={stay.id} className={`stay stay-tone-${i % 3}`}>
            <div className="stay-card">
              <div className="stay-hero">
                <span className="stay-mark" aria-hidden="true">
                  <HotelIcon />
                </span>
                <div className="stay-title">
                  <p className="stay-name">{stay.name}</p>
                  {stay.name_ko && stay.name_ko !== stay.name && (
                    <p className="stay-sub" lang="ko">
                      {stay.name_ko}
                    </p>
                  )}
                  {stay.address_ko && (
                    <p className="stay-sub" lang="ko">
                      {stay.address_ko}
                    </p>
                  )}
                </div>
                {stay.booking_ref && (
                  <p className="stay-ref">
                    <span>{b.bookingRef}</span>
                    <strong className="tabular">{stay.booking_ref}</strong>
                  </p>
                )}
              </div>
              <div className="stay-body">
                <div className="stay-bar">
                  <p className="stay-end">
                    <span>{b.checkIn}</span>
                    {formatDate(stay.check_in_date, language)}
                  </p>
                  <p className="stay-line">
                    {stay.check_in_date && stay.check_out_date && (
                      <span className="stay-nights">
                        <BedIcon />
                        {count(daysBetween(stay.check_in_date, stay.check_out_date), m.pass.night, m.pass.nights)}
                      </span>
                    )}
                  </p>
                  <p className="stay-end is-out">
                    <span>{b.checkOut}</span>
                    {formatDate(stay.check_out_date, language)}
                  </p>
                </div>
                <div className="stay-actions">
                  {stay.expected_arrival && (
                    <p className={isLate(stay.expected_arrival) ? "stay-arrive is-late" : "stay-arrive"}>
                      {isLate(stay.expected_arrival) ? <MoonIcon /> : <PlaneIcon />}
                      {fmt(b.arriving, { time: formatKst(stay.expected_arrival, language) })}
                    </p>
                  )}
                  <a className="stay-action" href={stayMapsUrl(stay)} target="_blank" rel="noopener noreferrer">
                    <PinIcon />
                    {m.map.openMap}
                  </a>
                  <ShowTaxiButton stayId={stay.id} label={b.showTaxi} />
                  {stay.phone && (
                    <a className="stay-action" href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`}>
                      <PhoneIcon />
                      {b.call}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <details className="editor">
              <summary className="button-ghost">
                <EditIcon />
                {b.edit}
              </summary>
              <StayForm stay={stay} m={m} language={language} />
            </details>
          </article>
        ))}
        <details className="editor" open={!board?.stays.length}>
          <summary className="button-ghost">
            <PlusIcon />
            {b.addStay}
          </summary>
          <StayForm m={m} language={language} />
        </details>
      </div>

      <ShowCards stays={(board?.stays ?? []).map((stay) => ({ id: stay.id, name: stay.name, address: stay.address_ko }))} m={m.show} airports={m.airports} />
      <TaxiCalculator
        stays={(board?.stays ?? []).map((stay) => ({ id: stay.id, name: stay.name, address: stay.address_ko }))}
        language={language}
        m={m.taxi}
        airports={m.airports}
      />
    </section>
  );
}

// 여행 요약 탑승권: 들어오는 공항 → 나가는 공항, 들르는 도시, 기간, 여행자
function TripPass({ board, m, language }: { board: TripBoard | null; m: Messages; language: string }) {
  const arrival = board?.arrival;
  const departure = board?.departure;
  if (!arrival?.datetime && !departure?.datetime) return null;
  const b = m.board;
  const cities = [...new Set(board?.itinerary.map((item) => item.city) ?? [])];
  const traveler = board?.stays.find((stay) => stay.guest_name)?.guest_name;
  const nights = arrival?.datetime && departure?.datetime ? daysBetween(kstDate(arrival.datetime), kstDate(departure.datetime)) : undefined;
  const airportName = (code?: string) => (code ? m.airports[code as keyof Messages["airports"]] : undefined);

  return (
    <section className="pass" aria-label={m.pass.trip}>
      <div className="pass-main">
        <div className="pass-route">
          <div className="pass-end">
            <span className="pass-code">{arrival?.airport ?? "—"}</span>
            <span className="pass-place">{airportName(arrival?.airport)}</span>
            <span className="pass-time tabular">
              {b.arrive} {formatKst(arrival?.datetime, language)}
            </span>
          </div>
          <div className="pass-track" aria-hidden="true">
            <span className="pass-plane">
              <PlaneIcon />
            </span>
          </div>
          <div className="pass-end is-out">
            <span className="pass-code">{departure?.airport ?? "—"}</span>
            <span className="pass-place">{airportName(departure?.airport)}</span>
            <span className="pass-time tabular">
              {b.depart} {formatKst(departure?.datetime, language)}
            </span>
          </div>
        </div>
        {cities.length > 0 && (
          <ol className="pass-cities">
            {cities.map((city) => (
              <li key={city}>
                {cityKo(city) && <span lang="ko">{cityKo(city)}</span>}
                {localCityName(city, language) !== cityKo(city) && <span className="pass-city-local">{localCityName(city, language)}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
      <dl className="pass-stub">
        <div>
          <dt>{m.pass.trip}</dt>
          <dd className="tabular">{formatRange(arrival?.datetime, departure?.datetime, language)}</dd>
          {nights !== undefined && (
            <dd className="pass-length">
              {count(nights, m.pass.night, m.pass.nights)} · {count(nights + 1, m.pass.day, m.pass.days)}
            </dd>
          )}
        </div>
        {traveler && (
          <div>
            <dt>{m.pass.traveler}</dt>
            <dd>{traveler}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function FlightCard({
  code,
  label,
  when,
  flightNo,
  terminal,
  m,
  language,
}: {
  code?: string;
  label: string;
  when?: string;
  flightNo?: string;
  terminal?: string;
  m: Messages;
  language: string;
}) {
  return (
    <article className="flight-card">
      <header className="flight-head">
        <span className="code-roundel" aria-hidden="true">
          {code ?? "—"}
        </span>
        <span className="flight-label">{label}</span>
        {flightNo && (
          <span className="flight-no tabular">
            <PlaneIcon />
            {flightNo}
          </span>
        )}
      </header>
      {when ? (
        <>
          <p className="flight-time tabular">{formatTimeKst(when, language)}</p>
          <p className="flight-date">
            {formatDate(kstDate(when), language)}
            {code && m.airports[code as keyof Messages["airports"]] && <> · {m.airports[code as keyof Messages["airports"]]}</>}
            {terminal && <span className="flight-terminal">{terminal}</span>}
          </p>
        </>
      ) : (
        <p className="flight-date muted">{m.board.notSet}</p>
      )}
    </article>
  );
}

// 여행 기간을 이용자 언어의 날짜 범위로 ("Oct 20 – 25", "10月20日～25日")
function formatRange(from: string | undefined, to: string | undefined, language: string): string {
  if (!from || !to) return [from, to].map((value) => (value ? formatDate(kstDate(value), language) : "—")).join(" – ");
  const format = new Intl.DateTimeFormat(language, { timeZone: "UTC", month: "short", day: "numeric" });
  return format.formatRange(new Date(`${kstDate(from)}T00:00:00Z`), new Date(`${kstDate(to)}T00:00:00Z`));
}

// 공항 꿀팁 (concept.md ②공항 도착·⑤출국 안내). 정해 둔 안내 문구만 보여주고, 상황에 맞는 것만 고른다.
function AirportTips({ board, m }: { board: TripBoard | null; m: Messages }) {
  const t = m.airportTips;
  const arrival = board?.arrival;
  if (!arrival?.datetime && !board?.departure?.datetime) return null;
  const late = arrival?.datetime ? isLateHour(kstMinutesOfDay(arrival.datetime)) : false;
  const landing = [
    ...(arrival?.airport === "ICN"
      ? [{ icon: <TerminalIcon />, title: arrival.terminal ? fmt(t.yourTerminal, { t: arrival.terminal }) : t.terminalT, body: t.terminalB }]
      : []),
    ...(late ? [{ icon: <MoonIcon />, title: t.lateT, body: t.lateB, late: true }] : []),
    { icon: <SimIcon />, title: t.simT, body: t.simB },
    { icon: <CardIcon />, title: t.tmoneyT, body: t.tmoneyB },
  ];
  const leaving = [
    { icon: <ClockIcon />, title: t.earlyT, body: t.earlyB },
    { icon: <ReceiptIcon />, title: t.refundT, body: t.refundB },
    { icon: <CoinsIcon />, title: t.leftT, body: t.leftB },
  ];
  return (
    <section className="tips" aria-label={t.title}>
      <header className="tips-head">
        <h4 className="tips-title">
          <span lang="ko">공항 꿀팁</span>
          {t.title !== "공항 꿀팁" && <span>{t.title}</span>}
        </h4>
        <ExecutionBadge level="안내" m={m} />
      </header>
      <div className="tips-cols">
        {[
          { key: "landing", heading: t.landing, items: landing },
          { key: "leaving", heading: t.leaving, items: leaving },
        ].map((col) => (
          <div key={col.key} className="tips-col">
            <p className="tips-col-title">{col.heading}</p>
            <ul>
              {col.items.map((tip) => (
                <li key={tip.title} className={"late" in tip ? "tip is-late" : "tip"}>
                  <span className="tip-icon">{tip.icon}</span>
                  <span className="tip-text">
                    <strong>{tip.title}</strong>
                    {tip.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// 지하철 경로의 출발·도착 후보: 보드의 숙소와 식당 예약 문의에 적힌 식당(지점). 좌표는 지도 검색으로 확인한다
function transitPlaces(board: TripBoard | null) {
  const stays = (board?.stays ?? []).map((stay) => ({ label: stay.name, query: stay.address_ko ?? stay.name_ko ?? stay.name }));
  const restaurants = (board?.requests ?? [])
    .filter((request) => request.slots.place_name)
    .map((request) => {
      const name = [request.slots.place_name, request.slots.place_branch].filter(Boolean).join(" ");
      return { label: name, query: name };
    });
  return [...stays, ...restaurants].filter((place, i, all) => all.findIndex((other) => other.label === place.label) === i);
}

// 착륙 시각과 숙소 도착 시각은 다르다: 이용자가 직접 확인하고 숙소 도착 시각을 바꾼다.
// 바뀐 도착 시각은 승인 대기 초안의 사실 확인에 걸려, 예전 시각으로 쓴 초안은 다시 써야 보낼 수 있다.
function HotelArrivalUpdate({ board, m, language }: { board: TripBoard | null; m: Messages; language: string }) {
  const arrivalDate = board?.arrival?.datetime ? kstDate(board.arrival.datetime) : undefined;
  const stay = board?.stays.find((candidate) => candidate.check_in_date === arrivalDate) ?? board?.stays[0];
  if (!stay) return null;
  const g = m.airportGuide;
  return (
    <form action={saveStay} className="ag-hotel">
      <p className="ag-hotel-title">{g.hotelTitle}</p>
      <p className="ag-note">
        {stay.name} · {g.hotelBody}
      </p>
      <input type="hidden" name="stay_id" value={stay.id} />
      <DateTimeField name="expected_arrival" defaultValue={toLocalInput(stay.expected_arrival)} language={language} labels={m.date} ariaLabel={g.hotelTitle} />
      <label className="ag-confirm">
        <input type="checkbox" name="confirm_arrival" required />
        {g.hotelConfirm}
      </label>
      <button type="submit" className="button-quiet">
        {g.hotelSave}
      </button>
      <p className="ag-note">{g.hotelNote}</p>
    </form>
  );
}

const TRANSFER_ICON = { taxi: TaxiIcon, bus: BusIcon, train: TrainIcon };

// 공항에서 시내로: 판다가 도착 시각에 맞는 수단을 추천하고, 예약이 되는 수단은 공식 예약 화면으로 넘긴다.
// 마중이는 결제·확정을 하지 않는다 (제품 불변 조건 6).
function AirportTransfer({ board, m, language }: { board: TripBoard | null; m: Messages; language: string }) {
  const arrival = board?.arrival;
  if (!arrival?.datetime) return null;
  const late = isLateHour(kstMinutesOfDay(arrival.datetime));
  const options = airportTransfers(arrival.airport, late);
  if (options.length === 0) return null;
  const t = m.transfer;
  const ko = getMessages("ko").transfer;
  const time = formatTimeKst(arrival.datetime, language);
  const say = late ? t.pandaLate : t.pandaDay;
  return (
    <section className="transfer" aria-label={t.title}>
      <h4 className="tips-title">
        <span lang="ko">{ko.title}</span>
        {t.title !== ko.title && <span>{t.title}</span>}
      </h4>
      <div className="transfer-guide">
        <img className="transfer-panda" src="/mascot/majung-panda.png" alt="" width={240} height={261} />
        <div className={late ? "guide-say transfer-say is-late" : "guide-say transfer-say"}>
          <p className="guide-ko" lang="ko">
            {fmt(late ? ko.pandaLate : ko.pandaDay, { time: formatTimeKst(arrival.datetime, "ko") })}
          </p>
          {language !== "ko" && <p className="guide-local">{fmt(say, { time })}</p>}
        </div>
      </div>
      <ul className="transfer-list">
        {options.map((option, i) => {
          const Icon = TRANSFER_ICON[option.icon];
          return (
            <li key={option.id} className={`transfer-item${option.available ? "" : " is-off"}`}>
              <span className="mode-tile">
                <Icon />
              </span>
              <div className="transfer-main">
                <p className="transfer-name">
                  {t[option.id]}
                  {i === 0 && option.available && <span className="leg-rec">{m.transport.recommended}</span>}
                  <ExecutionBadge level={option.level} m={m} />
                </p>
                <p className="transfer-note">{option.available ? t[`${option.id}Note`] : t.notNow}</p>
              </div>
              <div className="transfer-side">
                {option.minutes && <span className="leg-time">{formatDuration(option.minutes, m.transport)}</span>}
                {option.available &&
                  (option.link ? (
                    <a
                      className={option.link.kind === "book" ? "button transfer-go" : "button-quiet transfer-go"}
                      href={option.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {option.link.kind === "book" ? t.book : t.info}
                      <ExternalIcon className="leg-go" />
                    </a>
                  ) : (
                    <span className="transfer-free">{t.noBooking}</span>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// 숙소를 구글 지도에서 찾는다 (Maps URLs 검색 링크). 한국어 주소가 있으면 함께 넣어 같은 이름의 다른 곳을 피한다.
function stayMapsUrl(stay: Stay): string {
  const query = [stay.name_ko ?? stay.name, stay.address_ko].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function count(n: number, one: string, many: string): string {
  return n === 1 ? one : fmt(many, { n });
}

// 밤 10시부터 새벽 6시 사이 도착은 늦은 도착으로 표시한다
function isLate(value: string): boolean {
  const minutes = kstMinutesOfDay(value);
  return minutes >= 22 * 60 || minutes < 6 * 60;
}

// 도착 예정 시각은 마중이가 대화 중에 물어보고 저장한다 (얼리·늦은 체크인 문의 메일을 쓸 때)
function StayForm({ stay, m, language }: { stay?: Stay; m: Messages; language: string }) {
  const b = m.board;
  return (
    <form action={saveStay} className="editor-form">
      {stay && <input type="hidden" name="stay_id" value={stay.id} />}
      <div className="grid-2">
        <label className="label">
          {b.hotelName}
          <input className="field" name="name" required defaultValue={stay?.name ?? ""} />
        </label>
        <label className="label">
          {b.bookingRef}
          <input className="field" name="booking_ref" defaultValue={stay?.booking_ref ?? ""} />
        </label>
        <label className="label">
          {b.guestName}
          <input className="field" name="guest_name" defaultValue={stay?.guest_name ?? ""} />
        </label>
        <div className="label">
          {b.checkIn}
          <DateField name="check_in_date" defaultValue={stay?.check_in_date ?? ""} language={language} labels={m.date} ariaLabel={b.checkIn} />
        </div>
        <div className="label">
          {b.checkOut}
          <DateField name="check_out_date" defaultValue={stay?.check_out_date ?? ""} language={language} labels={m.date} ariaLabel={b.checkOut} />
        </div>
        <label className="label">
          {b.hotelEmail}
          <input className="field" type="email" name="email" defaultValue={stay?.email ?? ""} placeholder="hotel@example.com" />
        </label>
        <label className="label">
          {b.hotelPhone}
          <input className="field" name="phone" defaultValue={stay?.phone ?? ""} />
        </label>
        <label className="label label-wide">
          {b.address}
          <input className="field" name="address_ko" lang="ko" defaultValue={stay?.address_ko ?? ""} placeholder="서울 중구 명동8길 27" />
        </label>
      </div>
      <p className="editor-note">{b.stayChatNote}</p>
      <button type="submit" className="button">
        {stay ? b.saveStay : b.addStay}
      </button>
    </form>
  );
}

function EditIcon() {
  return (
    <svg className="ghost-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.5 2.5 13.5 5.5 6 13H3v-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="ghost-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
