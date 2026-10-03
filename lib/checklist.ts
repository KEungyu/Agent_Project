import type { TripBoard } from "./board/types";
import { legNeedsBooking } from "./map/route";
import { isLateHour } from "./transport/airport";
import { kstMinutesOfDay } from "./time";

// 여행 체크리스트 (PRD F-04, BACKLOG P2-5). 보드로 알 수 있는 항목은 자동으로 체크하고,
// 나머지(유심·환전 등)는 이용자가 직접 체크한다. 직접 체크한 상태는 화면(브라우저)에 저장한다.

export type ChecklistKey = "flights" | "stay" | "lateCheckin" | "transfer" | "sim" | "tmoney" | "money" | "rides" | "refund" | "airport";
export type ChecklistItem = { key: ChecklistKey; auto: boolean; done: boolean };

const late = (value?: string) => Boolean(value) && isLateHour(kstMinutesOfDay(value!));

export function buildChecklist(board: TripBoard | null): ChecklistItem[] {
  const stays = board?.stays ?? [];
  const requests = board?.requests ?? [];
  const items: ChecklistItem[] = [
    { key: "flights", auto: true, done: Boolean(board?.arrival) },
    { key: "stay", auto: true, done: stays.length > 0 },
  ];
  // 밤늦게 도착할 때만: 늦게 도착하는 숙소마다 늦은 체크인 답(수락·조건부 수락)을 받았으면 체크.
  // 숙소 도착 시각을 모르고 비행기만 늦으면, 어느 숙소든 답을 받았으면 체크한다.
  const lateStays = stays.filter((stay) => late(stay.expected_arrival));
  if (late(board?.arrival?.datetime) || lateStays.length > 0) {
    const answeredFor = (stayId?: string) =>
      requests.some(
        (request) =>
          request.type_id === "late_checkin" &&
          (stayId === undefined || request.target_id === stayId) &&
          (request.status === "done" || request.status === "conditional"),
      );
    const done = lateStays.length > 0 ? lateStays.every((stay) => answeredFor(stay.id)) : answeredFor();
    items.push({ key: "lateCheckin", auto: true, done });
  }
  items.push({ key: "transfer", auto: false, done: false }, { key: "sim", auto: false, done: false });
  items.push({ key: "tmoney", auto: false, done: false }, { key: "money", auto: false, done: false });
  // 예매가 필요한 도시 간 구간이 있을 때만(지하철 구간은 빼고): 모든 구간에 교통편이 준비·예매돼 있으면 체크
  const legs = (board?.itinerary ?? []).filter(
    (item, i, all) => i > 0 && all[i - 1].city !== item.city && legNeedsBooking(all[i - 1].city, item.city),
  );
  if (legs.length > 0) items.push({ key: "rides", auto: true, done: legs.every((leg) => leg.transport.status !== "none") });
  items.push({ key: "refund", auto: false, done: false }, { key: "airport", auto: false, done: false });
  return items;
}
