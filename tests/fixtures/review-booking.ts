// 2026-10-04 검토용 가상 예약 (실제 예약이 아니다). example.com으로도 실제 발송하지 않는다.
// 예약 시작(체크인)·체크아웃·호텔 도착을 서로 다른 사실로 둔다. 기준 시각은 검사마다 고정해 날짜가 바뀌어도 기대 결과가 같다.
export const REVIEW_STAY = {
  name: "Review Test Hotel (fictional)",
  email: "hotel@example.com",
  guest_name: "Test Guest",
  booking_ref: "REVIEW-ONLY",
  check_in_date: "2026-10-09",
  check_out_date: "2026-10-11",
};
export const REVIEW_ARRIVAL_AT_HOTEL = "2026-10-10T01:00+09:00";
export const REVIEW_FLIGHT_ARRIVAL = { datetime: "2026-10-09T23:10+09:00", airport: "ICN" };

// 고정 기준 시각 (KST)
export const FIXED_NOW = {
  beforeTrip: "2026-10-08T12:00:00+09:00",
  eveningOfCheckIn: "2026-10-09T21:00:00+09:00",
};

export const FIRST_MESSAGE =
  "This is a fictional review case, not a real reservation. Use the hotel and booking details on my trip board. My booking starts on 9 October 2026. I will arrive at the hotel at 01:00 on 10 October 2026, Korea time, after midnight. Please prepare a Korean message asking whether this late arrival is allowed. Do not send any email.";

export const NARROW_EDITS = {
  ja: "到着時刻だけを02:00に変更してください。ほかの情報は変えないでください。",
  "zh-CN": "只把到达时间改为02:00，其他信息保持不变。",
  fr: "Change juste l'heure d'arrivée à 02:00, ne touche à rien d'autre.",
} as const;
