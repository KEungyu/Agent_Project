import type { TripBoard } from "./board/types";
import { legNeedsBooking } from "./map/route";
import { isLateHour } from "./transport/airport";
import { kstMinutesOfDay } from "./time";

// 여행 체크리스트 (PRD F-04, BACKLOG P2-5). 여행 보드로 알 수 있는 항목만 체크리스트로 두고 자동으로 체크한다.
// 보드로 알 수 없는 준비(유심·환전 등)는 체크하지 않고 아래에 작은 팁으로만 보여준다.

export type ChecklistKey = "flights" | "stay" | "cities" | "lateCheckin" | "rides";
export type ChecklistItem = { key: ChecklistKey; done: boolean };
export const CHECKLIST_TIPS = ["transfer", "sim", "tmoney", "money", "refund", "airport"] as const;
export type ChecklistTip = (typeof CHECKLIST_TIPS)[number];

const late = (value?: string) => Boolean(value) && isLateHour(kstMinutesOfDay(value!));

export function buildChecklist(board: TripBoard | null): ChecklistItem[] {
  const stays = board?.stays ?? [];
  const requests = board?.requests ?? [];
  const items: ChecklistItem[] = [
    { key: "flights", done: Boolean(board?.arrival?.datetime && board?.departure?.datetime) },
    { key: "stay", done: stays.length > 0 },
    { key: "cities", done: (board?.itinerary.length ?? 0) > 0 },
  ];
  // 밤늦게 도착할 때만: 늦게 도착하는 숙소마다 늦은 체크인을 수락받았으면 체크.
  // 조건부 수락은 조건을 받아들이기(완료) 전까지 체크하지 않는다.
  // 숙소 도착 시각을 모르고 비행기만 늦으면, 어느 숙소든 답을 받았으면 체크한다.
  const lateStays = stays.filter((stay) => late(stay.expected_arrival));
  if (late(board?.arrival?.datetime) || lateStays.length > 0) {
    const answeredFor = (stayId?: string) =>
      requests.some(
        (request) =>
          request.type_id === "late_checkin" &&
          (stayId === undefined || request.target_id === stayId) &&
          request.status === "done",
      );
    const done = lateStays.length > 0 ? lateStays.every((stay) => answeredFor(stay.id)) : answeredFor();
    items.push({ key: "lateCheckin", done });
  }
  // 예매가 필요한 도시 간 구간이 있을 때만(지하철 구간은 빼고): 모든 구간에 교통편이 준비·예매돼 있으면 체크
  const legs = (board?.itinerary ?? []).filter(
    (item, i, all) => i > 0 && all[i - 1].city !== item.city && legNeedsBooking(all[i - 1].city, item.city),
  );
  if (legs.length > 0) items.push({ key: "rides", done: legs.every((leg) => leg.transport.status !== "none") });
  return items;
}
