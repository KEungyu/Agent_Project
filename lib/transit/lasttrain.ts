import type { DayType, OdsayResult, SubwaySchedule, TransitPath } from "./odsay";
import { serviceReaches } from "./subway";

// 경로의 지하철 구간마다 "지금 출발하면 탈 수 있는 열차"를 시간표에서 찾는다 (N04).
// - 역에 닿은 뒤 처음 오는 열차 중 내릴 역까지 가는 열차를 탄다: 그 출발 시각 + 탑승 시간 = 내리는 시각 (기다리는 시간 포함).
// - 내릴 역 앞에서 끝나는 열차(중간 종착)는 건너뛴다. 종착역으로 내릴 역까지 가는지 노선도 자료로 알 수 없는 열차와
//   정차역을 모르는 급행은 쓰지 않고, 그런 열차뿐이면 "확인 필요"로 둔다.
// - 한 구간을 확인하지 못하면 그다음 구간은 닿는 시각을 만들지 않고 "확인 필요"로 둔다. 확인하지 못한 구간이 있으면 "가능"이라고 하지 않는다.
// - 탑승 시간은 ODsay 구간 소요(sectionTime) 추정이라 실제 탑승·정시 도착을 보장하지 않는다.
// 공휴일은 앱이 알 수 없다: 일요일만 휴일 시간표로 보고, 화면에서 공휴일이면 다를 수 있다고 알린다.

export type LegCheck = { from: string; line: string; reachAt: string; board?: string; last?: string; status: "ok" | "missed" | "unknown" };
export type LastTrainCheck = { status: "ok" | "missed" | "unknown"; dayType: DayType; legs: LegCheck[]; busNotChecked: boolean };
// 종착역 terminus인 열차가 이 구간(from → to)을 끝까지 가는가. 모르면 undefined
export type Reaches = (leg: { name: string; from: string; to: string; stations: string[] }, terminus: string) => boolean | undefined;

const SERVICE_DAY_START = 4 * 60; // 기존 표시 기준. 제공사 경계 규칙 미확인: 00~04시에는 운행 가능을 판정하지 않는다.

function kstParts(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3_600_000);
  return { minutes: kst.getUTCHours() * 60 + kst.getUTCMinutes() + kst.getUTCSeconds() / 60, weekday: kst.getUTCDay() };
}

export function dayTypeAt(now: Date): DayType {
  const { minutes, weekday } = kstParts(now);
  const day = minutes < SERVICE_DAY_START ? (weekday + 6) % 7 : weekday;
  return day === 0 ? "holiday" : day === 6 ? "saturday" : "weekday";
}

// 운행일 기준 분: 00:30은 24:30으로 본다
const serviceMinutes = (minutes: number) => (minutes < SERVICE_DAY_START ? minutes + 24 * 60 : minutes);
const parseTime = (text: string): number | null => {
  const match = /^(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/.exec(text.trim());
  if (!match || Number(match[1]) > 27 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) return null;
  return serviceMinutes(Number(match[1]) * 60 + Number(match[2]) + Number(match[3] ?? 0) / 60);
};
const clock = (minutes: number) => {
  const m = Math.floor(((minutes % (24 * 60)) + 24 * 60) % (24 * 60));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const defaultReaches: Reaches = (leg, terminus) => serviceReaches(leg.name, terminus, leg.from, leg.to, leg.stations);

export async function checkLastTrains(
  path: TransitPath,
  now: Date,
  getSchedule: (stationID: number, wayCode: number | undefined) => Promise<OdsayResult<SubwaySchedule>>,
  reaches: Reaches = defaultReaches,
  holiday = false, // 이용자가 "오늘은 공휴일"이라고 확인하면 휴일 시간표로 본다 (앱은 공휴일을 스스로 알지 못한다)
): Promise<LastTrainCheck> {
  const dayType = holiday ? "holiday" : dayTypeAt(now);
  const minutes = kstParts(now).minutes;
  let at: number | null = minutes < SERVICE_DAY_START ? null : minutes; // 새벽 운행일 경계 또는 앞 구간 미확인
  const legs: LegCheck[] = [];
  let busNotChecked = false;
  for (const leg of path.legs) {
    if (leg.kind === "walk") {
      if (at !== null) at += leg.minutes;
      continue;
    }
    if (leg.kind === "bus") {
      busNotChecked = true;
      at = null;
      continue;
    }
    const check: LegCheck = { from: leg.from, line: leg.name, reachAt: at === null ? "" : clock(at), status: "unknown" };
    legs.push(check);
    if (at === null || !leg.stationID || (leg.wayCode !== 1 && leg.wayCode !== 2)) {
      at = null;
      continue;
    }
    const schedule = await getSchedule(leg.stationID, leg.wayCode);
    if (schedule.status !== "ok" || !schedule.data) {
      at = null;
      continue;
    }
    // 이 구간을 끝까지 가는 일반 열차만 (급행은 정차역을 몰라서, 종착역을 모르는 열차는 갈지 몰라서 뺀다)
    const departures = schedule.data[dayType][leg.wayCode === 1 ? "up" : "down"]
      .map((d) => ({ ...d, minutes: parseTime(d.time), reach: d.express ? undefined : reaches(leg, d.to) }))
      .filter((d): d is typeof d & { minutes: number } => d.minutes !== null)
      .sort((a, b) => a.minutes - b.minutes);
    const usable = departures.filter((d) => d.reach === true);
    if (usable.length) check.last = clock(usable.at(-1)!.minutes);
    const next = usable.find((d) => d.minutes >= at!);
    if (next) {
      check.board = clock(next.minutes);
      check.status = "ok";
      at = next.minutes + leg.minutes;
    } else {
      // 갈 수 있는 열차가 더 없다. 다만 확인 못 한 열차가 남아 있으면 단정하지 않는다
      const unsureLater = departures.some((d) => d.reach === undefined && d.minutes >= at!);
      check.status = unsureLater ? "unknown" : usable.length ? "missed" : "unknown";
      at = null;
    }
  }
  const status = legs.some((leg) => leg.status === "missed")
    ? "missed"
    : legs.length > 0 && legs.every((leg) => leg.status === "ok") && !busNotChecked
      ? "ok"
      : "unknown";
  return { status, dayType, legs, busNotChecked };
}
