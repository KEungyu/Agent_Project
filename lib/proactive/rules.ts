import { updateBoard } from "../board/store";
import type { Request, Stay, TripBoard } from "../board/types";
import type { Db } from "../db/client";
import { fmt, getMessages, type Messages } from "../i18n/messages";
import { legNeedsBooking, localCityName } from "../map/route";
import { formatDate, formatKst, formatTimeKst, kstDate, kstMinutesOfDay } from "../time";

// 먼저 챙겨주기 (ARCHITECTURE §7). 보드와 현재 시각만 보고 결정적으로 평가한다.
// 조건은 규칙별 함수로 두고, 문구는 i18n 데이터(messages.proactive)에 둔다.

export type RuleId = "r1" | "r2" | "r3" | "r4" | "r5" | "r6";
export type AlertLevel = "안내" | "준비" | "대행";

export type Alert = {
  rule_id: RuleId;
  target_id: string;
  level: AlertLevel;
  priority: "high" | "medium";
  message: string;
  action: string; // "처리하기"를 누르면 마중에게 보내는 요청 문장 (이용자 언어)
};

type Found = { target_id: string; values: Record<string, string | number> };
type Rule = {
  id: RuleId;
  level: AlertLevel;
  priority: Alert["priority"];
  cooldownHours: number;
  find(board: TripBoard, now: Date, locale: string): Found[];
};

const HOUR = 3_600_000;
const hoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / HOUR;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const requestsFor = (board: TripBoard, typeId: string, stayId: string) =>
  board.requests.filter((request) => request.type_id === typeId && request.target_id === stayId);

const RULES: Rule[] = [
  {
    // R1 늦은 체크인 미확인: 체크인 마감(없으면 22:00) 이후나 새벽 도착인데, 진행 중이거나 끝난 문의가 없다
    id: "r1",
    level: "대행",
    priority: "high",
    cooldownHours: 6,
    find: (board, _now, locale) =>
      board.stays
        .filter((stay) => {
          if (!stay.expected_arrival) return false;
          const arrival = kstMinutesOfDay(stay.expected_arrival);
          const late = arrival >= minutes(stay.checkin_cutoff ?? "22:00") || arrival < 5 * 60;
          const handled = requestsFor(board, "late_checkin", stay.id).some((request) => request.status !== "declined");
          return late && !handled;
        })
        .map((stay) => ({ target_id: stay.id, values: { stay: stay.name, time: formatKst(stay.expected_arrival, locale) } })),
  },
  {
    // R2 도시 간 교통편 없음: 다음 도시로 옮기는 날이 48시간 안인데 교통편이 없다
    id: "r2",
    level: "준비",
    priority: "high",
    cooldownHours: 12,
    find: (board, now, locale) =>
      board.itinerary.flatMap((item, i) => {
        const previous = board.itinerary[i - 1];
        if (!previous || previous.city === item.city || item.transport.status !== "none") return [];
        // 지하철처럼 예매할 것이 없는 구간은 알리지 않는다
        if (!legNeedsBooking(previous.city, item.city)) return [];
        const hours = hoursBetween(now, new Date(`${item.date}T00:00:00+09:00`));
        if (hours > 48 || hours < -24) return [];
        return [{ target_id: `${item.date}-${item.city}`, values: { city: localCityName(item.city, locale), from: localCityName(previous.city, locale), date: formatDate(item.date, locale) } }];
      }),
  },
  {
    // R3 회신 지연: 회신 대기 중이고 도착까지 6시간 미만이거나, 발송 후 12시간이 지났는데 도착이 이틀 안이다
    id: "r3",
    level: "준비",
    priority: "high",
    cooldownHours: 3,
    find: (board, now) =>
      board.requests.flatMap((request: Request) => {
        if (request.status !== "awaiting_reply" || !request.sent) return [];
        const stay = board.stays.find((candidate) => candidate.id === request.target_id);
        const arrival = request.slots.expected_arrival ?? stay?.expected_arrival;
        if (!arrival) return [];
        const hoursLeft = hoursBetween(now, new Date(arrival));
        const waited = hoursBetween(new Date(request.sent.at), now);
        if (hoursLeft <= 0 || !(hoursLeft < 6 || (waited >= 12 && hoursLeft < 48))) return [];
        return [{ target_id: request.id, values: { stay: stay?.name ?? "", hours: Math.max(1, Math.round(hoursLeft)) } }];
      }),
  },
  {
    // R4 체크아웃–출국 공백: 출국일에 체크아웃하고 비행기까지 4시간 이상 남는데 짐 보관 문의가 없다
    id: "r4",
    level: "대행",
    priority: "medium",
    cooldownHours: 24,
    find: (board, _now, locale) => {
      const departure = board.departure?.datetime;
      if (!departure) return [];
      return board.stays.flatMap((stay: Stay) => {
        if (stay.check_out_date !== kstDate(departure)) return [];
        const checkout = stay.checkout_time ?? "11:00";
        const gap = (kstMinutesOfDay(departure) - minutes(checkout)) / 60;
        if (gap < 4 || requestsFor(board, "luggage_storage", stay.id).length > 0) return [];
        // 공항으로 출발할 시각(비행기 3시간 전)까지 맡긴다고 본다
        const until = formatTimeKst(new Date(new Date(departure).getTime() - 3 * HOUR).toISOString(), locale);
        return [
          {
            target_id: stay.id,
            values: { stay: stay.name, checkout, flight: formatTimeKst(departure, locale), until },
          },
        ];
      });
    },
  },
  {
    // R5 심야 공항 도착: 0시~5시 도착 (운행 시간 기준은 [확인 필요])
    id: "r5",
    level: "안내",
    priority: "medium",
    cooldownHours: 24,
    find: (board, _now, locale) => {
      const arrival = board.arrival;
      if (!arrival || kstMinutesOfDay(arrival.datetime) >= 5 * 60) return [];
      return [{ target_id: "arrival", values: { time: formatKst(arrival.datetime, locale), airport: arrival.airport } }];
    },
  },
  {
    // R6 출국 전날: 한국 시각으로 출국일이 내일이다 (공항에 2~3시간 일찍 가도록 미리 알린다)
    id: "r6",
    level: "안내",
    priority: "medium",
    cooldownHours: 12,
    find: (board, now, locale) => {
      const departure = board.departure;
      if (!departure?.datetime) return [];
      const tomorrow = kstDate(new Date(now.getTime() + 24 * HOUR).toISOString());
      if (kstDate(departure.datetime) !== tomorrow) return [];
      const code = departure.airport ?? "";
      const airport = getMessages(locale).airports[code as keyof Messages["airports"]] ?? code;
      return [{ target_id: "departure", values: { time: formatTimeKst(departure.datetime, locale), airport } }];
    },
  },
];

export function evaluateAlerts(board: TripBoard, now: Date): Alert[] {
  const m: Messages = getMessages(board.user_language);
  const dismissed = board.proactive.dismissed.filter((entry) => new Date(entry.until) > now);
  return RULES.flatMap((rule) =>
    rule
      .find(board, now, board.user_language)
      .filter((found) => !dismissed.some((entry) => entry.rule_id === rule.id && entry.target_id === found.target_id))
      .map((found) => ({
        rule_id: rule.id,
        target_id: found.target_id,
        level: rule.level,
        priority: rule.priority,
        message: fmt(m.proactive[rule.id].message, found.values),
        action: fmt(m.proactive[rule.id].action, found.values),
      })),
  ).sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
}

// 닫은 알림은 규칙의 cooldown 동안 다시 띄우지 않는다
export function dismissAlert(db: Db, board: TripBoard, ruleId: RuleId, targetId: string, now: Date): void {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  if (!rule) return;
  const until = new Date(now.getTime() + rule.cooldownHours * HOUR).toISOString();
  const kept = board.proactive.dismissed.filter((entry) => new Date(entry.until) > now);
  updateBoard(db, board.id, { proactive: { dismissed: [...kept, { rule_id: ruleId, target_id: targetId, until }] } });
}
