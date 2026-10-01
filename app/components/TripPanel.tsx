import { addItinerary, saveStay, saveTrip } from "@/app/actions";
import type { Stay, TripBoard } from "@/lib/board/types";
import { formatKst, toLocalInput } from "@/lib/time";

export function TripPanel({ board }: { board: TripBoard | null }) {
  return (
    <section className="panel" aria-labelledby="trip-heading">
      <h2 id="trip-heading">My trip board</h2>

      <form action={saveTrip} className="card">
        <h3>Flights</h3>
        <div className="grid-2">
          <label>
            Arrival in Korea
            <input type="datetime-local" name="arrival_datetime" defaultValue={toLocalInput(board?.arrival?.datetime)} />
          </label>
          <label>
            Airport
            <select name="arrival_airport" defaultValue={board?.arrival?.airport ?? "ICN"}>
              <option value="ICN">Incheon (ICN)</option>
              <option value="GMP">Gimpo (GMP)</option>
              <option value="PUS">Gimhae (PUS)</option>
              <option value="CJU">Jeju (CJU)</option>
            </select>
          </label>
          <label>
            Flight no.
            <input name="arrival_flight_no" defaultValue={board?.arrival?.flight_no ?? ""} placeholder="KE908" />
          </label>
          <label>
            Departure from Korea
            <input type="datetime-local" name="departure_datetime" defaultValue={toLocalInput(board?.departure?.datetime)} />
          </label>
        </div>
        <button type="submit">Save flights</button>
      </form>

      <div className="card">
        <h3>Stays</h3>
        {board?.stays.map((stay) => (
          <details key={stay.id} className="stay">
            <summary>
              <strong>{stay.name}</strong>
              <span className="muted">
                {stay.check_in_date ?? "?"} → {stay.check_out_date ?? "?"} · arriving {formatKst(stay.expected_arrival)}
              </span>
            </summary>
            <StayForm stay={stay} />
          </details>
        ))}
        <details className="stay" open={!board?.stays.length}>
          <summary>
            <strong>+ Add a stay</strong>
          </summary>
          <StayForm />
        </details>
      </div>

      <div className="card">
        <h3>Cities</h3>
        {board?.itinerary.length ? (
          <ul className="list">
            {board.itinerary.map((item) => (
              <li key={`${item.date}-${item.city}`}>
                <span>{item.date}</span> <strong>{item.city}</strong>
                <span className="muted">
                  {" "}
                  · transport {item.transport.status === "none" ? "not arranged" : item.transport.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No cities yet.</p>
        )}
        <form action={addItinerary} className="inline-form">
          <input type="date" name="date" required aria-label="Date" />
          <input name="city" required placeholder="City (e.g. Gyeongju)" aria-label="City" />
          <button type="submit">Add</button>
        </form>
      </div>
    </section>
  );
}

function StayForm({ stay }: { stay?: Stay }) {
  return (
    <form action={saveStay} className="stay-form">
      {stay && <input type="hidden" name="stay_id" value={stay.id} />}
      <div className="grid-2">
        <label>
          Hotel name
          <input name="name" required defaultValue={stay?.name ?? ""} />
        </label>
        <label>
          Booking number
          <input name="booking_ref" defaultValue={stay?.booking_ref ?? ""} />
        </label>
        <label>
          Name on booking
          <input name="guest_name" defaultValue={stay?.guest_name ?? ""} />
        </label>
        <label>
          Expected arrival at hotel
          <input type="datetime-local" name="expected_arrival" defaultValue={toLocalInput(stay?.expected_arrival)} />
        </label>
        <label>
          Check-in
          <input type="date" name="check_in_date" defaultValue={stay?.check_in_date ?? ""} />
        </label>
        <label>
          Check-out
          <input type="date" name="check_out_date" defaultValue={stay?.check_out_date ?? ""} />
        </label>
        <label>
          Hotel email
          <input type="email" name="email" defaultValue={stay?.email ?? ""} />
        </label>
        <label>
          Hotel phone
          <input name="phone" defaultValue={stay?.phone ?? ""} />
        </label>
      </div>
      <button type="submit">{stay ? "Save stay" : "Add stay"}</button>
    </form>
  );
}
