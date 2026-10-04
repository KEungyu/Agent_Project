// 새 숙소 예약 조건. 기존 예약의 문의(늦은 체크인 등)와 다른 흐름이며, 아직 없는 예약번호는 받지 않는다.
// 숙박 날짜는 달력 날짜 그대로 둔다(자정 이후 도착 때문에 체크인 날짜를 바꾸지 않는다).

export type StayBookingCriteria = {
  destination: string; // 도시·지역·숙소 이름 (이용자가 말한 그대로)
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  adults: number;
  rooms: number;
  children_ages?: number[]; // 아이가 있을 때만, 이용자가 알려 준 나이
};

export type CriteriaProblem = "dates_order" | "date_format" | "past_check_in" | "adults" | "rooms" | "rooms_over_guests" | "child_age" | "destination";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// today: 한국 날짜 "YYYY-MM-DD" (지난 체크인을 막는 데 쓴다)
export function checkStayCriteria(criteria: StayBookingCriteria, today: string): CriteriaProblem[] {
  const problems: CriteriaProblem[] = [];
  if (!criteria.destination.trim()) problems.push("destination");
  if (!DATE.test(criteria.check_in) || !DATE.test(criteria.check_out)) problems.push("date_format");
  else {
    if (criteria.check_out <= criteria.check_in) problems.push("dates_order");
    if (criteria.check_in < today) problems.push("past_check_in");
  }
  if (!Number.isInteger(criteria.adults) || criteria.adults < 1) problems.push("adults");
  if (!Number.isInteger(criteria.rooms) || criteria.rooms < 1) problems.push("rooms");
  else if (Number.isInteger(criteria.adults) && criteria.rooms > criteria.adults) problems.push("rooms_over_guests");
  if (criteria.children_ages?.some((age) => !Number.isInteger(age) || age < 0 || age > 17)) problems.push("child_age");
  return problems;
}

export function nights(criteria: Pick<StayBookingCriteria, "check_in" | "check_out">): number {
  return Math.round((Date.parse(`${criteria.check_out}T00:00:00Z`) - Date.parse(`${criteria.check_in}T00:00:00Z`)) / 86_400_000);
}
