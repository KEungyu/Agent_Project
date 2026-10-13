import type { Db } from "../db/client";
import { z } from "zod";
import { realMailConfig } from "../mail/mailer";
import { addStay, createBoard, getBoard, getCurrentBoard, recordEvent } from "./store";
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

export function presentationDemoRecipient(env: Record<string, string | undefined> = process.env): string | null {
  const mode = env.MAIL_MODE ?? "mock";
  if (mode === "mock") return "front@majungi-demo.test";
  const config = realMailConfig(env);
  if (mode !== "real" || !config.ok || config.allowlist.length !== 1) return null;
  const recipient = config.allowlist[0];
  return z.string().email().safeParse(recipient).success && !recipient.endsWith(".test") ? recipient : null;
}

// shortcut: 2026년 10월 발표용 고정 일정. 이후 시연에서는 날짜와 회신 예문을 함께 갱신한다.
export function loadPresentationDemo(db: Db, previousBoardId: string | null): TripBoard {
  const recipient = presentationDemoRecipient();
  if (!recipient) throw new Error("모의 발송 모드 또는 시험 수신처 1개의 실제 메일 설정이 필요합니다.");
  return db.$client.transaction(() => {
    if ((getCurrentBoard(db)?.id ?? null) !== previousBoardId) {
      throw new Error("여행이 변경되었습니다. 새로고침 후 다시 눌러 주세요.");
    }
    const board = createBoard(db, {
      user_language: "en",
      traveler_role: "traveler",
      arrival: { datetime: "2026-10-19T22:30+09:00", airport: "ICN", terminal: "T2" },
      departure: { datetime: "2026-10-25T18:30+09:00", airport: "ICN" },
      itinerary: [
        { date: "2026-10-19", city: "Seoul", transport: { status: "none" } },
        { date: "2026-10-22", city: "Gyeongju", transport: { status: "none" } },
        { date: "2026-10-23", city: "Busan", transport: { status: "none" } },
      ],
    });
    addStay(db, board.id, {
      name: "Majungi Demo Hotel (Fictional)",
      address_ko: "서울 중구 명동 (시연용 가상 숙소)",
      email: recipient,
      booking_ref: "DEMO-20261019",
      guest_name: "Emma Smith",
      check_in_date: "2026-10-19",
      check_out_date: "2026-10-22",
      expected_arrival: "2026-10-20T01:30+09:00",
    }, "user");
    recordEvent(db, board.id, "user_action", { action: "load_presentation_demo", previous_board_id: previousBoardId });
    return getBoard(db, board.id)!;
  })();
}
