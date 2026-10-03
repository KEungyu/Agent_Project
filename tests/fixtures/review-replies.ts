import type { ReplyClass } from "../../lib/board/types";

// 2026-10-04 피드백의 회신 검사 자료 R01~R08 (가상). 공통 예약: Review Test Hotel, REVIEW-ONLY,
// 체크인 2026-10-09, 호텔 도착 2026-10-10 01:00 KST. 실제 업체 메일이 아니다.
// needsCheck: 자동으로 분류·완료하지 말고 이용자 확인으로 넘겨야 하는 회신. class는 그때의 분류를 따지지 않는다.
export const REVIEW_FACTS = {
  stay_name: "Review Test Hotel",
  guest_name: "Test Guest",
  booking_ref: "REVIEW-ONLY",
  check_in_date: "2026-10-09",
  expected_arrival: "2026-10-10T01:00+09:00",
};

export const REVIEW_REPLIES: { id: string; raw_ko: string; expect: { class: ReplyClass; needsCheck: false } | { needsCheck: true } }[] = [
  { id: "R01", raw_ko: "예약번호 REVIEW-ONLY의 2026년 10월 10일 새벽 1시 체크인 가능합니다.", expect: { class: "done", needsCheck: false } },
  { id: "R02", raw_ko: "10월 9일 22시까지 온라인 체크인을 완료하시면 10월 10일 새벽 1시 입실 가능합니다.", expect: { class: "conditional", needsCheck: false } },
  { id: "R03", raw_ko: "예약번호와 투숙객 성함을 알려주시면 늦은 체크인 가능 여부를 확인해 드리겠습니다.", expect: { class: "info_requested", needsCheck: false } },
  { id: "R04", raw_ko: "새벽 1시 체크인은 불가능합니다. 밤 11시까지 도착해 주세요.", expect: { class: "declined", needsCheck: false } },
  { id: "R05", raw_ko: "저희 프런트는 24시간 운영합니다.", expect: { needsCheck: true } },
  { id: "R06", raw_ko: "10월 11일 새벽 1시 도착은 가능합니다.", expect: { needsCheck: true } },
  { id: "R07", raw_ko: "담당자는 새벽 1시 가능하다고 안내했지만, 현재 예약 규정에는 자정 이후 입실 불가로 표시됩니다.", expect: { needsCheck: true } },
  { id: "R08", raw_ko: "아마 괜찮을 것 같습니다. 다만 지금 확답은 드릴 수 없습니다.", expect: { needsCheck: true } },
];
