import { isLanguageCode } from "../i18n/languages";
import { getStation } from "./subway";
import { searchTransitPaths, subwaySchedule, type OdsayResult, type TransitPath } from "./odsay";
import { checkLastTrains, type LastTrainCheck } from "./lasttrain";
import { searchScheduledRoutes } from "./scheduled";

type Options = Parameters<typeof searchTransitPaths>[3];

// 서버와 WEB 호출은 같은 역 검증·파서·막차 계산을 사용한다. WEB 호출자는 WEB 키만 담은 env를 명시한다.
export async function scheduledTransit(fromId: string, toId: string, departure: string, holiday = false, options: Options = {}) {
  const from = getStation(fromId);
  const to = getStation(toId);
  if (!from || !to || from.id === to.id) return { status: "empty" as const };
  return searchScheduledRoutes(from, to, departure, holiday, options);
}

export async function transitPaths(
  fromId: string, toId: string, language: string, holiday = false, options: Options = {},
): Promise<OdsayResult<(TransitPath & { lastTrain?: LastTrainCheck })[]>> {
  const from = getStation(fromId);
  const to = getStation(toId);
  if (!from || !to || from.id === to.id) return { status: "empty" };
  const result = await searchTransitPaths(from, to, isLanguageCode(language) ? language : "en", options);
  if (result.status !== "ok" || !result.data?.length) return result;
  // 하루 한도를 위해 첫 번째 추천 경로만 막차를 확인한다.
  const [first, ...rest] = result.data;
  const lastTrain = await checkLastTrains(first, options.now?.() ?? new Date(),
    (stationID, wayCode) => subwaySchedule(stationID, wayCode, options), undefined, holiday);
  return { ...result, data: [{ ...first, lastTrain }, ...rest] };
}
