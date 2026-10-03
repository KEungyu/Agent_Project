import { describe, expect, it } from "vitest";
import { addStay, createBoard, getBoard, updateBoard } from "../board/store";
import type { TripBoard } from "../board/types";
import { openDb, type Db } from "../db/client";
import { hashDraft } from "../requests/drafting";
import { createRequest, transition } from "../requests/state";
import { dismissAlert, evaluateAlerts } from "./rules";

const NOW = new Date("2026-10-19T12:00:00+09:00");
const DAY_ARRIVAL = { datetime: "2026-10-19T14:00+09:00", airport: "ICN" };

function board(setup: (db: Db, id: string) => void): { db: Db; board: TripBoard } {
  const db = openDb(":memory:");
  const created = createBoard(db, { arrival: DAY_ARRIVAL });
  setup(db, created.id);
  return { db, board: getBoard(db, created.id)! };
}

function awaitingReply(db: Db, boardId: string, stayId: string, sentAt: string) {
  const request = createRequest(db, { boardId, typeId: "late_checkin", targetId: stayId, slots: {} }, "agent");
  const draft = { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") };
  transition(db, request.id, "pending_approval", "agent", { patch: { draft } });
  transition(db, request.id, "sent", "system", {
    patch: {
      approval: { approved_at: sentAt, approved_by: "user", draft_hash: draft.hash },
      sent: { at: sentAt, message_id: "mock-1", mode: "mock", to: "front@hotel.test" },
    },
  });
  transition(db, request.id, "awaiting_reply", "system");
}

const FIXTURES: Record<string, () => { db: Db; board: TripBoard }> = {
  r1: () => board((db, id) => addStay(db, id, { name: "Hotel A", expected_arrival: "2026-10-20T23:30+09:00" }, "user")),
  r2: () =>
    board((db, id) =>
      updateBoard(db, id, {
        itinerary: [
          { date: "2026-10-19", city: "Seoul", transport: { status: "none" } },
          { date: "2026-10-20", city: "Gyeongju", transport: { status: "none" } },
        ],
      }),
    ),
  r3: () =>
    board((db, id) => {
      const stay = addStay(db, id, { name: "Hotel C", expected_arrival: "2026-10-19T16:00+09:00" }, "user");
      awaitingReply(db, id, stay.id, "2026-10-19T08:00:00+09:00");
    }),
  r4: () =>
    board((db, id) => {
      updateBoard(db, id, { departure: { datetime: "2026-10-25T18:30+09:00", airport: "GMP" } });
      addStay(db, id, { name: "Hotel D", check_out_date: "2026-10-25", expected_arrival: "2026-10-20T15:00+09:00" }, "user");
    }),
  r5: () => board((db, id) => updateBoard(db, id, { arrival: { datetime: "2026-10-20T00:40+09:00", airport: "ICN" } })),
};

describe("먼저 챙겨주기 규칙", () => {
  for (const [rule, make] of Object.entries(FIXTURES)) {
    it(`${rule} 픽스처에서는 ${rule} 알림 하나만 나온다`, () => {
      const alerts = evaluateAlerts(make().board, NOW);
      expect(alerts.map((alert) => alert.rule_id)).toEqual([rule]);
    });
  }

  it("알림 문구와 처리 요청에 보드 값이 채워진다", () => {
    const [r1] = evaluateAlerts(FIXTURES.r1().board, NOW);
    expect(r1.message).toBe("You reach Hotel A around Oct 20, 23:30, but late check-in isn't confirmed yet.");
    expect(r1.action).toBe("Please ask Hotel A about late check-in. I arrive at Oct 20, 23:30.");
    const [r3] = evaluateAlerts(FIXTURES.r3().board, NOW);
    expect(r3.message).toContain("you arrive in 4 hours");
    const [r4] = evaluateAlerts(FIXTURES.r4().board, NOW);
    expect(r4.message).toBe("You check out of Hotel D at 11:00 but fly at 18:30. Need a place for your bags?");
  });

  it("늦은 체크인 문의를 시작하면 R1이 사라지고, 거절되면 다시 나온다", () => {
    const { db, board: b } = FIXTURES.r1();
    const request = createRequest(db, { boardId: b.id, typeId: "late_checkin", targetId: b.stays[0].id, slots: {} }, "agent");
    expect(evaluateAlerts(getBoard(db, b.id)!, NOW)).toEqual([]);
    db.$client.prepare("UPDATE requests SET status = 'declined' WHERE id = ?").run(request.id);
    expect(evaluateAlerts(getBoard(db, b.id)!, NOW).map((alert) => alert.rule_id)).toEqual(["r1"]);
  });

  it("닫은 알림은 cooldown 동안 다시 나오지 않는다", () => {
    const { db, board: b } = FIXTURES.r1();
    const [alert] = evaluateAlerts(b, NOW);
    dismissAlert(db, b, alert.rule_id, alert.target_id, NOW);
    const after = getBoard(db, b.id)!;
    expect(evaluateAlerts(after, new Date(NOW.getTime() + 5 * 3_600_000))).toEqual([]);
    expect(evaluateAlerts(after, new Date(NOW.getTime() + 7 * 3_600_000))).toHaveLength(1);
  });

  it("보드 언어로 문구를 만든다", () => {
    const { db, board: b } = FIXTURES.r5();
    updateBoard(db, b.id, { user_language: "ko" });
    const [alert] = evaluateAlerts(getBoard(db, b.id)!, NOW);
    expect(alert.message).toContain("도착하네요");
    expect(alert.action).toContain("ICN");
  });
});
