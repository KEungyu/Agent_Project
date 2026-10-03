import type { TripBoard } from "./board/types";
import { buildChecklist, type ChecklistKey } from "./checklist";
import { fmt, type Messages } from "./i18n/messages";
import type { Alert } from "./proactive/rules";
import type { RequestType } from "./request-types/schema";

// 전광판(도착 안내판) 내용. 보드의 실제 상태만 보여준다.
// 우선순위: 승인 대기 요청 → 먼저 챙길 알림 → 회신 대기 → 체크리스트에서 아직 안 된 첫 항목 → 준비 완료.
// 체크리스트 진행도도 함께 실어 전광판 "준비" 줄에 보여준다.

export type HeroLine = {
  kind: "approval" | "alerts" | "reply" | "checklist" | "clear";
  title: string;
  detail?: string;
  line?: "act" | "prep" | "info";
};
export type HeroModel = {
  next: HeroLine;
  countdown: { label: string; target: string; place?: string } | null;
  checklist: { done: number; total: number; items: { key: ChecklistKey; done: boolean }[]; next?: ChecklistKey };
};

const LINE = { 안내: "info", 준비: "prep", 대행: "act" } as const;

export function buildHero(board: TripBoard | null, alerts: Alert[], types: RequestType[], m: Messages, now: Date): HeroModel {
  const requests = board?.requests ?? [];
  const typeOf = (id: string) => types.find((type) => type.id === id);
  const label = (id: string) => typeOf(id)?.label[board?.user_language ?? "en"] ?? typeOf(id)?.label.en ?? id;
  const stayName = (id?: string) => board?.stays.find((stay) => stay.id === id)?.name;

  const items = buildChecklist(board);
  const checklist = { done: items.filter((item) => item.done).length, total: items.length, items, next: items.find((item) => !item.done)?.key };

  const pending = requests.find((request) => request.status === "pending_approval");
  const waiting = requests.find((request) => request.status === "awaiting_reply");
  let next: HeroLine;
  if (pending) {
    next = {
      kind: "approval",
      title: `${m.status.pending_approval} · ${label(pending.type_id)}`,
      detail: stayName(pending.target_id),
      line: LINE[typeOf(pending.type_id)?.execution_level ?? "대행"],
    };
  } else if (alerts.length > 0) {
    next = { kind: "alerts", title: fmt(m.hero.heads, { n: alerts.length }), detail: alerts[0].message, line: LINE[alerts[0].level] };
  } else if (waiting) {
    next = { kind: "reply", title: `${m.status.awaiting_reply} · ${label(waiting.type_id)}`, detail: stayName(waiting.target_id), line: "act" };
  } else if (checklist.next) {
    next = {
      kind: "checklist",
      title: m.checklist.items[checklist.next],
      detail: fmt(m.checklist.progress, { done: checklist.done, total: checklist.total }),
      line: "prep",
    };
  } else {
    next = { kind: "clear", title: m.hero.clear };
  }

  const arrival = board?.arrival?.datetime;
  const departure = board?.departure?.datetime;
  const countdown =
    arrival && new Date(arrival) > now
      ? { label: m.hero.arrivalIn, target: arrival, place: board?.arrival?.airport }
      : departure && new Date(departure) > now
        ? { label: m.hero.departureIn, target: departure, place: board?.departure?.airport }
        : null;

  return { next, countdown, checklist };
}
