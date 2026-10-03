import type { TripBoard } from "@/lib/board/types";
import { removeItineraryAction } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { cityKo } from "@/lib/i18n/places";
import { localCityName } from "@/lib/map/route";
import { formatDate, formatKst } from "@/lib/time";
import { XIcon } from "./icons";

// 여행 일정을 노선도로 그린다: 입국 공항 → 도시들 → 출국 공항.
// 도시 사이 구간은 교통편 상태를 보여준다(없으면 점선).

type Stop = {
  key: string;
  name: string;
  meta: string;
  kind: "airport" | "city";
  segment?: "none" | "planned" | "booked_by_user" | "airport";
  date?: string;
};

export function TripRoute({ board, m, locale }: { board: TripBoard | null; m: Messages; locale: string }) {
  const stops: Stop[] = [];
  if (board?.arrival) {
    stops.push({
      key: "arrival",
      kind: "airport",
      name: board.arrival.airport,
      meta: `${m.board.arrive} ${formatKst(board.arrival.datetime, locale)}`,
    });
  }
  board?.itinerary.forEach((item, i) => {
    stops.push({
      key: `${item.date}-${item.city}`,
      kind: "city",
      name: item.city,
      meta: formatDate(item.date, locale),
      segment: i === 0 ? "airport" : item.transport.status,
      date: item.date,
    });
  });
  if (board?.departure?.datetime) {
    stops.push({
      key: "departure",
      kind: "airport",
      name: board.departure.airport ?? "",
      meta: `${m.board.depart} ${formatKst(board.departure.datetime, locale)}`,
      segment: "airport",
    });
  }

  if (stops.length < 2) return <p className="empty-note">{m.board.noCities}</p>;

  const localName = (name: string) => localCityName(name, locale);
  const segmentLabel = { none: m.board.transportNone, planned: m.board.transportPlanned, booked_by_user: m.board.transportBooked };
  return (
    <ol className="trip-route" style={{ "--stops": stops.length } as React.CSSProperties}>
      {stops.map((stop) => (
        <li key={stop.key} className={`trip-stop trip-stop-${stop.kind} ${stop.segment ? `seg-${stop.segment}` : ""}`}>
          {stop.segment && stop.segment !== "airport" && (
            <span className="trip-seg-label">{segmentLabel[stop.segment]}</span>
          )}
          <span className="trip-dot" aria-hidden="true">
            {stop.kind === "airport" ? stop.name.slice(0, 3) : null}
          </span>
          {stop.kind === "airport" ? (
            <span className="sr-only">{m.airports[stop.name as keyof Messages["airports"]] ?? stop.name}</span>
          ) : (
            <span className="trip-name">
              {cityKo(stop.name) && (
                <span className="trip-name-ko" lang="ko">
                  {cityKo(stop.name)}
                </span>
              )}
              {localName(stop.name) !== cityKo(stop.name) && <span>{localName(stop.name)}</span>}
            </span>
          )}
          <span className="trip-meta">{stop.meta}</span>
          {stop.date && (
            <form action={removeItineraryAction.bind(null, stop.date, stop.name)} className="trip-remove-form">
              <button
                type="submit"
                className="trip-remove"
                aria-label={fmt(m.board.removeCity, { city: localName(stop.name) })}
                title={fmt(m.board.removeCity, { city: localName(stop.name) })}
              >
                <XIcon />
              </button>
            </form>
          )}
        </li>
      ))}
    </ol>
  );
}
