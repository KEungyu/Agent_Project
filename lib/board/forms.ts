import type { Db } from "../db/client";
import { fromLocalInput } from "../time";
import { addStay, createBoard, getCurrentBoard, recordEvent, updateBoard, updateStay } from "./store";
import type { StayFields, TripBoard } from "./types";

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
      ? { datetime: arrivalAt, airport: text(form, "arrival_airport") ?? "ICN", flight_no: text(form, "arrival_flight_no") }
      : board.arrival,
    departure: departureAt
      ? { datetime: departureAt, airport: text(form, "departure_airport"), flight_no: text(form, "departure_flight_no") }
      : board.departure,
  });
  recordEvent(db, board.id, "user_action", { action: "save_trip" });
  return getCurrentBoard(db)!;
}

const STAY_TEXT_FIELDS = ["name", "email", "phone", "booking_ref", "guest_name", "check_in_date", "check_out_date"] as const;

export function saveStayForm(db: Db, form: FormData): TripBoard {
  const board = ensureBoard(db);
  const fields: Partial<StayFields> = {};
  for (const key of STAY_TEXT_FIELDS) {
    const value = text(form, key);
    if (value !== undefined) fields[key] = value;
  }
  const arrival = fromLocalInput(text(form, "expected_arrival") ?? "");
  if (arrival) fields.expected_arrival = arrival;

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
