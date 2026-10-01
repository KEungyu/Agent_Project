import { addItinerary, saveStay, saveTrip } from "@/app/actions";
import type { Stay, TripBoard } from "@/lib/board/types";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { formatDate, formatKst, toLocalInput } from "@/lib/time";
import { SignTitle } from "./SignTitle";
import { TripRoute } from "./TripRoute";

type Props = { board: TripBoard | null; m: Messages; language: string };

export function TripPanel({ board, m, language }: Props) {
  const b = m.board;
  return (
    <section className="panel" aria-labelledby="trip-heading">
      <SignTitle id="trip-heading" ko="여행 보드" text={b.title} />

      <div className="sign">
        <SignTitle as="h3" ko="도시 일정" text={b.cities} />
        <TripRoute board={board} m={m} locale={language} />
        <form action={addItinerary} className="inline-form">
          <input className="field" type="date" name="date" required aria-label={b.date} />
          <input className="field" name="city" required placeholder={b.cityPlaceholder} aria-label={b.city} />
          <button type="submit" className="button-quiet">
            {b.addCity}
          </button>
        </form>
      </div>

      <div className="sign">
        <SignTitle as="h3" ko="항공편" text={b.flights} />
        <dl className="sign-rows">
          <FlightRow code={board?.arrival?.airport} label={b.arrival} when={board?.arrival?.datetime} extra={board?.arrival?.flight_no} m={m} language={language} />
          <FlightRow code={board?.departure?.airport} label={b.departure} when={board?.departure?.datetime} extra={board?.departure?.flight_no} m={m} language={language} />
        </dl>
        <details className="editor">
          <summary className="button-quiet">{b.edit}</summary>
          <form action={saveTrip} className="editor-form">
            <div className="grid-2">
              <label className="label">
                {b.arrival}
                <input className="field" type="datetime-local" name="arrival_datetime" defaultValue={toLocalInput(board?.arrival?.datetime)} />
              </label>
              <label className="label">
                {b.airport}
                <select className="field" name="arrival_airport" defaultValue={board?.arrival?.airport ?? "ICN"}>
                  <option value="ICN">Incheon (ICN)</option>
                  <option value="GMP">Gimpo (GMP)</option>
                  <option value="PUS">Gimhae (PUS)</option>
                  <option value="CJU">Jeju (CJU)</option>
                </select>
              </label>
              <label className="label">
                {b.flightNo}
                <input className="field" name="arrival_flight_no" defaultValue={board?.arrival?.flight_no ?? ""} placeholder="KE908" />
              </label>
              <label className="label">
                {b.departure}
                <input className="field" type="datetime-local" name="departure_datetime" defaultValue={toLocalInput(board?.departure?.datetime)} />
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
        {board?.stays.map((stay) => (
          <article key={stay.id} className="stay">
            <div className="stay-main">
              <p className="stay-name">{stay.name}</p>
              <p className="stay-meta">
                {formatDate(stay.check_in_date, language)} – {formatDate(stay.check_out_date, language)}
                {stay.expected_arrival && <> · {fmt(b.arriving, { time: formatKst(stay.expected_arrival, language) })}</>}
              </p>
              {stay.booking_ref && (
                <p className="stay-ref">
                  <span>{b.bookingRef}</span> <span className="tabular">{stay.booking_ref}</span>
                </p>
              )}
            </div>
            <details className="editor">
              <summary className="button-quiet">{b.edit}</summary>
              <StayForm stay={stay} b={b} />
            </details>
          </article>
        ))}
        <details className="editor" open={!board?.stays.length}>
          <summary className="button-quiet">{b.addStay}</summary>
          <StayForm b={b} />
        </details>
      </div>
    </section>
  );
}

function FlightRow({
  code,
  label,
  when,
  extra,
  m,
  language,
}: {
  code?: string;
  label: string;
  when?: string;
  extra?: string;
  m: Messages;
  language: string;
}) {
  return (
    <div className="sign-row">
      <dt>
        <span className="code-roundel" aria-hidden="true">
          {code ?? "—"}
        </span>
        {label}
      </dt>
      <dd className="tabular">
        {when ? formatKst(when, language) : <span className="muted">{m.board.notSet}</span>}
        {extra && <span className="sign-row-extra">{extra}</span>}
      </dd>
    </div>
  );
}

function StayForm({ stay, b }: { stay?: Stay; b: Messages["board"] }) {
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
        <label className="label">
          {b.expectedArrival}
          <input className="field" type="datetime-local" name="expected_arrival" defaultValue={toLocalInput(stay?.expected_arrival)} />
        </label>
        <label className="label">
          {b.checkIn}
          <input className="field" type="date" name="check_in_date" defaultValue={stay?.check_in_date ?? ""} />
        </label>
        <label className="label">
          {b.checkOut}
          <input className="field" type="date" name="check_out_date" defaultValue={stay?.check_out_date ?? ""} />
        </label>
        <label className="label">
          {b.hotelEmail}
          <input className="field" type="email" name="email" defaultValue={stay?.email ?? ""} />
        </label>
        <label className="label">
          {b.hotelPhone}
          <input className="field" name="phone" defaultValue={stay?.phone ?? ""} />
        </label>
      </div>
      <button type="submit" className="button">
        {stay ? b.saveStay : b.addStay}
      </button>
    </form>
  );
}
