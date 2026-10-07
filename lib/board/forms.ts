import type { Db } from "../db/client";
import { fromLocalInput } from "../time";
import { addStay, createBoard, getCurrentBoard, recordEvent, updateBoard, updateStay } from "./store";
import type { StayFields, TransportStatus, TripBoard } from "./types";

// 화면 폼(FormData)을 보드 변경으로 옮긴다. 서버 액션은 이 함수들을 부르고 화면만 갱신한다.

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export function ensureBoard(db: Db): TripBoard {
  return getCurrentBoard(db) ?? createBoard(db);
}

export function saveTripForm(db: Db, form: FormData): TripBoard {
  const board = ensureBoard(db);
  const arrivalAt = fromLocalInput(text(form, "arrival_datetime") ?? "");
  const departureAt = fromLocalInput(text(form, "departure_datetime") ?? "");
  updateBoard(db, board.id, {
    user_language: text(form, "user_language") ?? board.user_language,
    arrival: arrivalAt
      ? {
          datetime: arrivalAt,
          airport: text(form, "arrival_airport") ?? "ICN",
          terminal: text(form, "arrival_terminal"),
          flight_no: text(form, "arrival_flight_no"),
        }
      : board.arrival,
    departure: departureAt
      ? {
          datetime: departureAt,
          airport: text(form, "departure_airport") ?? board.departure?.airport,
          flight_no: text(form, "departure_flight_no") ?? board.departure?.flight_no,
        }
      : board.departure,
  });
  recordEvent(db, board.id, "user_action", { action: "save_trip" });
  return getCurrentBoard(db)!;
}

const STAY_TEXT_FIELDS = ["name", "address_ko", "email", "phone", "booking_ref", "guest_name", "check_in_date", "check_out_date"] as const;

export function saveStayForm(db: Db, form: FormData): TripBoard {
  const board = ensureBoard(db);
  const fields: Partial<StayFields> = {};
  for (const key of STAY_TEXT_FIELDS) {
    const value = text(form, key);
    if (value !== undefined) fields[key] = value;
  }
  const arrival = fromLocalInput(text(form, "expected_arrival") ?? "");
  if (arrival) fields.expected_arrival = arrival;
  // 호텔 도착이 비행기 착륙보다 이르면 잘못 넣었을 가능성이 크다: 화면에서 따로 확인(confirm_before_landing)한 경우만 저장한다
  const landing = board.arrival?.datetime;
  if (arrival && landing && Date.parse(arrival) < Date.parse(landing) && text(form, "confirm_before_landing") !== "on") {
    throw new Error("Hotel arrival is before the flight lands. Confirm it on the form first.");
  }

  const stayId = text(form, "stay_id");
  if (stayId) {
    updateStay(db, stayId, fields, "user");
  } else {
    if (!fields.name) throw new Error("Hotel name is required");
    addStay(db, board.id, fields as StayFields, "user");
  }
  recordEvent(db, board.id, "user_action", { action: stayId ? "update_stay" : "add_stay" });
  return getCurrentBoard(db)!;
}

export function addItineraryForm(db: Db, form: FormData): TripBoard {
  const board = ensureBoard(db);
  const date = text(form, "date");
  const city = text(form, "city");
  if (!date || !city) throw new Error("Date and city are required");
  const itinerary = [...board.itinerary, { date, city, transport: { status: "none" as const } }].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  updateBoard(db, board.id, { itinerary });
  recordEvent(db, board.id, "user_action", { action: "add_itinerary" });
  return getCurrentBoard(db)!;
}

// 도시 일정 한 칸(날짜+도시)의 교통편 상태를 바꾼다. 마중은 예매 준비(planned)까지만 하고,
// 예매 완료(booked_by_user)는 이용자가 공식 사이트에서 결제한 뒤 직접 표시한다.
export function setLegTransport(db: Db, date: string, city: string, status: TransportStatus, note?: string): TripBoard {
  const board = ensureBoard(db);
  if (!board.itinerary.some((item) => item.date === date && item.city === city)) throw new Error("Itinerary item not found");
  const itinerary = board.itinerary.map((item) =>
    item.date === date && item.city === city ? { ...item, transport: { status, ...(note ? { note } : {}) } } : item,
  );
  updateBoard(db, board.id, { itinerary });
  recordEvent(db, board.id, "user_action", { action: "set_transport", date, city, status, ...(note ? { note } : {}) });
  return getCurrentBoard(db)!;
}

// 도시 일정에서 한 칸(날짜+도시)을 뺀다
export function removeItineraryItem(db: Db, date: string, city: string): TripBoard {
  const board = ensureBoard(db);
  const itinerary = board.itinerary.filter((item) => !(item.date === date && item.city === city));
  if (itinerary.length === board.itinerary.length) throw new Error("Itinerary item not found");
  updateBoard(db, board.id, { itinerary });
  recordEvent(db, board.id, "user_action", { action: "remove_itinerary", date, city });
  return getCurrentBoard(db)!;
}

// 새 여행 시작: 아무것도 등록되지 않은 새 보드를 만든다 (화면 언어만 이어받는다). 예전 보드는 그대로 남는다.
export function startNewTrip(db: Db): TripBoard {
  const previous = getCurrentBoard(db);
  const board = createBoard(db, { user_language: previous?.user_language ?? "en" });
  recordEvent(db, board.id, "user_action", { action: "start_new_trip" });
  return board;
}

// 등록된 것이 하나라도 있는지 (오프닝에서 "이전 여행 이어 보기"를 보여줄지 정한다)
export function hasTripData(board: TripBoard | null): boolean {
  return Boolean(board && (board.arrival || board.departure || board.itinerary.length || board.stays.length || board.requests.length));
}
