import type { ItineraryItem, TripBoard } from "@/lib/board/types";
import { removeItineraryAction } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { cityKo } from "@/lib/i18n/places";
import { legNeedsBooking, localCityName } from "@/lib/map/route";
import { formatDate, formatKst } from "@/lib/time";
import { XIcon } from "./icons";

// 여행 일정을 노선도로 그린다: 입국 공항 → 도시들 → 출국 공항.
// 같은 도시에 며칠 머물면 역 하나로 묶고 머무는 날 수를 적는다("서울 → 서울" 같은 구간을 만들지 않는다).
// 항공편이 없으면 첫 도시에 "출발", 마지막 도시에 "도착" 표시를 붙여 시작과 끝을 보여준다.
// 도시 사이 구간은 교통편 상태를 보여준다(없으면 점선).

type Stop = {
  key: string;
  name: string;
  meta: string;
  kind: "airport" | "city";
  segment?: "none" | "planned" | "booked_by_user" | "airport" | "free";
  dates?: string[];
  flag?: "start" | "finish";
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
  // 이어지는 같은 도시 날짜를 하나로 묶는다. 구간 상태는 그 도시에 처음 가는 날의 교통편을 따른다.
  const groups: { city: string; items: ItineraryItem[] }[] = [];
  for (const item of board?.itinerary ?? []) {
    const last = groups.at(-1);
    if (last && last.city === item.city) last.items.push(item);
    else groups.push({ city: item.city, items: [item] });
  }
  groups.forEach((group, i) => {
    const first = group.items[0];
    const dates = group.items.map((item) => item.date);
    const range =
      dates.length > 1 ? `${formatDate(dates[0], locale)} – ${formatDate(dates.at(-1), locale)}` : formatDate(dates[0], locale);
    stops.push({
      key: `${first.date}-${group.city}`,
      kind: "city",
      name: group.city,
      meta: range,
      // 예매가 필요 없는 구간(지하철)은 "교통편 없음"이 아니라 "예매 필요 없음"으로 보여준다
      segment:
        i === 0
          ? board?.arrival
            ? "airport"
            : undefined
          : first.transport.status === "none" && !legNeedsBooking(groups[i - 1].city, group.city)
            ? "free"
            : first.transport.status,
      dates,
      flag: i === 0 && !board?.arrival ? "start" : i === groups.length - 1 && !board?.departure?.datetime && groups.length > 1 ? "finish" : undefined,
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

  if (stops.length === 0 || (stops.length === 1 && stops[0].kind === "airport")) return <p className="empty-note">{m.board.noCities}</p>;

  const localName = (name: string) => localCityName(name, locale);
  const segmentLabel = { none: m.board.transportNone, planned: m.board.transportPlanned, booked_by_user: m.board.transportBooked, free: m.board.transportFree };
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
          {(stop.flag || (stop.dates && stop.dates.length > 1)) && (
            <span className="trip-tags">
              {stop.dates && stop.dates.length > 1 && <span className="trip-tag">{fmt(m.board.days, { n: stop.dates.length })}</span>}
              {stop.flag && (
                <span className={`trip-tag trip-flag is-${stop.flag}`}>
                  <span lang="ko">{stop.flag === "start" ? "출발" : "도착"}</span>
                  {locale !== "ko" && <span>{stop.flag === "start" ? m.board.start : m.board.finish}</span>}
                </span>
              )}
            </span>
          )}
          {stop.dates && (
            <form action={removeItineraryAction.bind(null, stop.dates, stop.name)} className="trip-remove-form">
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
