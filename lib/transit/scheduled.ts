import { scheduledDeparture } from "./schedule-time";
export { scheduledDeparture } from "./schedule-time";
import { callOdsay, type OdsayResult } from "./odsay";

type Options = Parameters<typeof callOdsay>[3];
type Station = { ko: string; lat: number; lon: number };
export type ScheduledPath = {
  minutes: number; fare: number; transfers: number;
  departure: string; arrival: string;
  legs: { from: string; to: string; line: string; departure: string; arrival: string; minutes: number; transfer: boolean; express: boolean }[];
};
export type ScheduledRoutes = { notice: "normal" | "first" | "last" | "unknown"; paths: ScheduledPath[] };

// OSM 역 번호를 ODsay ID로 추측하지 않는다. 공식 검색의 이름과 좌표가 모두 맞는 역만 쓴다.
async function stationId(station: Station, options: Options): Promise<OdsayResult<number>> {
  return callOdsay("searchStation", { stationName: station.ko, stationClass: 2 }, (result) => {
    const normalize = (name: string) => name.replace(/\s/g, "").replace(/역$/, "");
    const rows = Array.isArray(result.station) ? result.station : [];
    const matches = rows.filter((row) => row.stationClass === 2 && typeof row.stationName === "string" &&
      normalize(row.stationName) === normalize(station.ko) && Number.isInteger(row.stationID) && row.stationID > 0 &&
      Math.abs(Number(row.x) - station.lon) < 0.005 && Math.abs(Number(row.y) - station.lat) < 0.005);
    return matches.length === 1 ? matches[0].stationID as number : null;
  }, options);
}

const clock = (value: unknown): value is string => typeof value === "string" && /^(?:[01]\d|2[0-7]):[0-5]\d:[0-5]\d$/.test(value);
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value : [];

export async function searchScheduledRoutes(from: Station, to: Station, departure: string, holiday = false, options: Options = {}): Promise<OdsayResult<ScheduledRoutes>> {
  const query = scheduledDeparture(departure, holiday);
  if (!query) return { status: "error", code: "invalid_departure" };
  if (query.unverified) return { status: "error", code: "service_day_unverified" };
  const start = await stationId(from, options);
  if (start.status !== "ok" || !start.data) return { status: start.status, code: start.code };
  const end = await stationId(to, options);
  if (end.status !== "ok" || !end.data) return { status: end.status, code: end.code };
  return callOdsay("subwayPathSchedule", { SID: start.data, EID: end.data, MODE: 1, DAY: query.day, TIME: query.time }, (result) => {
    const notice = result.notificationCode === 0 ? "normal" : result.notificationCode === 2 ? "first" : result.notificationCode === 3 ? "last" : "unknown";
    const paths: ScheduledPath[] = [];
    for (const raw of list(result.path)) {
      const info = raw.info as Record<string, unknown> | undefined;
      if (!info || info.day !== query.day || !number(info.totalTime) || !number(info.cardFare) || !number(info.transferCount) ||
          !clock(info.departureTime) || !clock(info.arrivalTime)) continue;
      const parts = list(raw.subPath);
      if (!parts.length || !parts.some((part) => part.movingType === 1) || parts.some((part) => ![1, 2].includes(Number(part.movingType)) ||
        (part.movingType === 1 && (typeof part.startName !== "string" || typeof part.endName !== "string" || typeof part.laneName !== "string")) ||
        !number(part.sectionTime) || !clock(part.departureTime) || !clock(part.arrivalTime))) continue;
      paths.push({ minutes: info.totalTime, fare: info.cardFare, transfers: info.transferCount,
        departure: info.departureTime, arrival: info.arrivalTime,
        // 실제 movingType=2는 시각과 소요시간만 온다. 역명·노선을 추측하지 않는다.
        legs: parts.map((part) => ({ from: typeof part.startName === "string" ? part.startName : "", to: typeof part.endName === "string" ? part.endName : "", line: typeof part.laneName === "string" ? part.laneName : "",
          departure: String(part.departureTime), arrival: String(part.arrivalTime), minutes: Number(part.sectionTime),
          transfer: part.movingType === 2, express: part.isExpressLane === "Y" })) });
    }
    // 미상 안내 코드·요청보다 이른 열차를 정상 출발로 내보내지 않는다.
    const inconsistent = notice === "normal" && paths.some((path) => path.departure.slice(0, 5).replace(":", "") < query.time);
    return paths.length ? { notice: inconsistent ? "unknown" : notice, paths } : null;
  }, options);
}
