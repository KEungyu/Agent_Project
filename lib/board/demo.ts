import type { Db } from "../db/client";
import { addStay, createBoard, getBoard } from "./store";
import type { TripBoard } from "./types";

// PRD 페르소나 Emma의 가상 보드. 이메일 도메인은 실제로 존재하지 않는 .test를 쓴다.
export function seedDemoBoard(db: Db): TripBoard {
  const board = createBoard(db, {
    user_language: "en",
    traveler_role: "traveler",
    arrival: { datetime: "2026-10-20T00:40+09:00", airport: "ICN", terminal: "T2", flight_no: "KE908" },
    departure: { datetime: "2026-10-25T18:30+09:00", airport: "GMP" },
    itinerary: [
      { date: "2026-10-20", city: "Seoul", transport: { status: "none" } },
      { date: "2026-10-22", city: "Gyeongju", transport: { status: "none" } },
      { date: "2026-10-23", city: "Busan", transport: { status: "none" } },
    ],
  });
  addStay(
    db,
    board.id,
    {
      name: "Hotel Example Myeongdong",
      email: "front@hotel-example.test",
      phone: "+82-2-000-0000",
      booking_ref: "BK123456",
      guest_name: "Emma Smith",
      check_in_date: "2026-10-19",
      check_out_date: "2026-10-22",
      expected_arrival: "2026-10-20T01:30+09:00",
    },
    "user",
  );
  return getBoard(db, board.id)!;
}
