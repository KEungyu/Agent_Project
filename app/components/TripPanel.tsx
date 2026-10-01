import { addItinerary, saveStay, saveTrip } from "@/app/actions";
import type { Stay, TripBoard } from "@/lib/board/types";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { formatDate, formatKst, toLocalInput } from "@/lib/time";
import { DateField, DateTimeField } from "./DateField";
import { SignTitle } from "./SignTitle";
import { KoreaMap } from "./KoreaMap";
import { TripRoute } from "./TripRoute";
import type { LanguageCode } from "@/lib/i18n/languages";

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
          <DateField name="date" required language={language} labels={m.date} ariaLabel={b.date} />
          <input className="field" name="city" required placeholder={b.cityPlaceholder} aria-label={b.city} />
          <button type="submit" className="button-quiet">
            {b.addCity}
          </button>
        </form>
        <KoreaMap itinerary={board?.itinerary ?? []} arrivalAirport={board?.arrival?.airport} language={language as LanguageCode} m={m} />
      </div>

      <div className="sign">
        <SignTitle as="h3" ko="항공편" text={b.flights} />
        <dl className="sign-rows">
          <FlightRow code={board?.arrival?.airport} label={b.arrival} when={board?.arrival?.datetime} extra={board?.arrival?.flight_no} m={m} language={language} />
          <FlightRow code={board?.departure?.airport} label={b.departure} when={board?.departure?.datetime} extra={board?.departure?.flight_no} m={m} language={language} />
        </dl>
        <details className="editor">
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
                {b.flightNo}
                <input className="field" name="arrival_flight_no" defaultValue={board?.arrival?.flight_no ?? ""} placeholder="KE908" />
              </label>
              <div className="label">
                {b.departure}
                <DateTimeField name="departure_datetime" defaultValue={toLocalInput(board?.departure?.datetime)} language={language} labels={m.date} ariaLabel={b.departure} />
              </div>
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
          {b.expectedArrival}
          <DateTimeField name="expected_arrival" defaultValue={toLocalInput(stay?.expected_arrival)} language={language} labels={m.date} ariaLabel={b.expectedArrival} />
        </div>
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
