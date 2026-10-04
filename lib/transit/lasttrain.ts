import type { DayType, OdsayResult, SubwaySchedule, TransitPath } from "./odsay";

// 경로의 지하철 구간마다 "지금 출발하면 그 역에 닿는 시각"과 그 역·방면의 막차 시각을 비교한다 (N04).
// 닿는 시각은 지금 + 앞 구간들의 소요 시간(ODsay 값)이라 기다리는 시간이 빠진 추정이다.
// 첫 구간만 보지 않고 환승 구간까지 모두 본다. 확인하지 못한 구간이 있으면 "가능"이라고 하지 않는다.
// 공휴일은 앱이 알 수 없다: 일요일만 휴일 시간표로 보고, 화면에서 공휴일이면 다를 수 있다고 알린다.

export type LegCheck = { from: string; line: string; reachAt: string; last?: string; status: "ok" | "missed" | "unknown" };
export type LastTrainCheck = { status: "ok" | "missed" | "unknown"; dayType: DayType; legs: LegCheck[]; busNotChecked: boolean };

const SERVICE_DAY_START = 4 * 60; // 새벽 4시 전은 전날 운행일로 본다 (막차가 자정을 넘기 때문)

function kstParts(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  return { minutes: kst.getUTCHours() * 60 + kst.getUTCMinutes(), weekday: kst.getUTCDay() };
}

export function dayTypeAt(now: Date): DayType {
  const { minutes, weekday } = kstParts(now);
  const day = minutes < SERVICE_DAY_START ? (weekday + 6) % 7 : weekday;
  return day === 0 ? "holiday" : day === 6 ? "saturday" : "weekday";
}

// 운행일 기준 분: 00:30은 24:30으로 본다
const serviceMinutes = (minutes: number) => (minutes < SERVICE_DAY_START ? minutes + 24 * 60 : minutes);
const parseTime = (text: string): number | null => {
  const match = /^(\d{1,2}):?(\d{2})/.exec(text.trim());
  return match ? serviceMinutes(Number(match[1]) * 60 + Number(match[2])) : null;
};
const clock = (minutes: number) => {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export async function checkLastTrains(
  path: TransitPath,
  now: Date,
  getSchedule: (stationID: number, wayCode: number | undefined) => Promise<OdsayResult<SubwaySchedule>>,
): Promise<LastTrainCheck> {
  const dayType = dayTypeAt(now);
  let at = serviceMinutes(kstParts(now).minutes);
  const legs: LegCheck[] = [];
  let busNotChecked = false;
  for (const leg of path.legs) {
    if (leg.kind === "subway") {
      const check: LegCheck = { from: leg.from, line: leg.name, reachAt: clock(at), status: "unknown" };
      if (leg.stationID && (leg.wayCode === 1 || leg.wayCode === 2)) {
        const schedule = await getSchedule(leg.stationID, leg.wayCode);
        const departures = schedule.status === "ok" ? schedule.data![dayType][leg.wayCode === 1 ? "up" : "down"] : [];
        const marked = departures.filter((d) => d.lastFlag);
        const times = (marked.length ? marked : departures).map((d) => parseTime(d.time)).filter((t): t is number => t !== null);
        if (times.length) {
          const last = Math.max(...times);
          check.last = clock(last);
          check.status = at <= last ? "ok" : "missed";
        }
      }
      legs.push(check);
    } else if (leg.kind === "bus") {
      busNotChecked = true;
    }
    at += leg.minutes;
  }
  const status = legs.some((leg) => leg.status === "missed")
    ? "missed"
    : legs.length > 0 && legs.every((leg) => leg.status === "ok") && !busNotChecked
      ? "ok"
      : "unknown";
  return { status, dayType, legs, busNotChecked };
}
