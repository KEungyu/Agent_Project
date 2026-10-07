// 날짜 자체는 API에 전달할 수 없다. 달력 요일과 이용자의 공휴일 확인으로 DAY를 정한다.
export function scheduledDeparture(value: string, holiday = false) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value) return null;
  const hour = date.getUTCHours();
  return { day: holiday || date.getUTCDay() === 0 ? 3 : date.getUTCDay() === 6 ? 2 : 1,
    time: value.slice(11).replace(":", ""), unverified: hour < 4 };
}
