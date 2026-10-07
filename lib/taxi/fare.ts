// 서울 중형택시 요금 (서울시 물가정보 택시 요금 기준). 미터기 요금의 대략 범위를 낸다.
// 주간: 기본 1.6km 4,800원, 131m당 100원, 시속 15km 이하일 때 30초당 100원.
// 심야: 22~23시·02~04시 기본 5,800원·120원, 23~02시 기본 6,700원·140원. 서울 밖(시계외)은 20% 할증.
// 도로가 막히는 정도를 알 수 없으므로 덜 막힐 때와 많이 막힐 때를 범위로 보여준다. 통행료는 따로 낸다.

export type FarePeriod = "day" | "late" | "midnight";

// 기존 공항 버튼의 택시 승강장 좌표. 화면 선택과 공동사업구역 예외 판정이 같은 값을 쓴다.
export const AIRPORT_TAXI_POINTS: Record<string, { lat: number; lng: number }> = {
  ICN: { lat: 37.4492, lng: 126.4509 },
  GMP: { lat: 37.5583, lng: 126.7906 },
};

export const FARE_RATES: Record<FarePeriod, { base: number; unit: number; surcharge: number }> = {
  day: { base: 4800, unit: 100, surcharge: 0 },
  late: { base: 5800, unit: 120, surcharge: 20 },
  midnight: { base: 6700, unit: 140, surcharge: 40 },
};

const BASE_METERS = 1600;
const UNIT_METERS = 131;
const UNIT_SECONDS = 30;

// 한국 시각 기준 하루 중 분 → 요금 시간대
export function farePeriod(minutesOfDay: number): FarePeriod {
  const hour = Math.floor(minutesOfDay / 60) % 24;
  if (hour === 23 || hour < 2) return "midnight";
  if (hour === 22 || hour === 2 || hour === 3) return "late";
  return "day";
}

export type FareEstimate = { low: number; high: number; period: FarePeriod; minutesLow: number; minutesHigh: number };

// distanceMeters·durationSeconds는 막히지 않을 때의 도로 경로 값이다
export function estimateFare(
  distanceMeters: number,
  durationSeconds: number,
  period: FarePeriod,
  options: { outsideSeoul?: boolean } = {},
): FareEstimate {
  const { base, unit } = FARE_RATES[period];
  const distanceUnits = Math.ceil(Math.max(0, distanceMeters - BASE_METERS) / UNIT_METERS);
  const meter = base + distanceUnits * unit;
  // 경로 시간은 길이 비었을 때 값이다. 신호·정체로 느리게 가는 시간을 덜 막히면 그 30%, 많이 막히면 130%로 보고 시간요금을 더한다.
  // 고속도로가 많은 경로(평균 시속이 높음)는 시간요금이 덜 붙으므로 그 비율을 30%까지 줄인다.
  const kmh = durationSeconds > 0 ? distanceMeters / durationSeconds * 3.6 : 0;
  const urban = Math.min(1, Math.max(0.3, (70 - kmh) / 40));
  const slowLow = (durationSeconds * 0.3 * urban) / UNIT_SECONDS;
  const slowHigh = (durationSeconds * 1.3 * urban) / UNIT_SECONDS;
  // 서울 경계를 넘으면 넘은 구간에만 시계외 할증이 붙는다. 그 비율을 모르므로 높은 쪽에만 20%를 더한다.
  // 심야 요금에 다시 1.2를 곱하면 40%+20%가 68%가 된다. 공식 중복 상한 60%에 맞게 가산 비율로 환산한다.
  const highFactor = options.outsideSeoul ? (100 + FARE_RATES[period].surcharge + 20) / (100 + FARE_RATES[period].surcharge) : 1;
  const round = (won: number) => Math.round(won / 100) * 100;
  return {
    low: round(meter + Math.floor(slowLow) * unit),
    high: round((meter + Math.ceil(slowHigh) * unit) * highFactor),
    period,
    minutesLow: Math.max(1, Math.round(durationSeconds / 60)),
    minutesHigh: Math.max(1, Math.round((durationSeconds * (1 + 1.2 * urban)) / 60)),
  };
}
