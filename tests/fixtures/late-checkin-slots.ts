// 늦은 체크인 초안 평가용 가상 조건 3세트 (PRD 페르소나). 실제 업체·개인 정보가 아니다.
export const LATE_CHECKIN_FIXTURES: { persona: string; language: string; slots: Record<string, string> }[] = [
  {
    persona: "Emma (traveler)",
    language: "en",
    slots: {
      stay_name: "Hotel Example Myeongdong",
      guest_name: "Emma Smith",
      booking_ref: "BK123456",
      check_in_date: "2026-10-19",
      expected_arrival: "2026-10-20T01:30+09:00",
    },
  },
  {
    persona: "Daniel (business)",
    language: "en",
    slots: {
      stay_name: "Pangyo Business Hotel Example",
      guest_name: "Daniel Weber",
      booking_ref: "PG-77821",
      check_in_date: "2026-11-03",
      expected_arrival: "2026-11-03T23:40+09:00",
    },
  },
  {
    persona: "Priya (trainee)",
    language: "en",
    slots: {
      stay_name: "Daejeon Residence Example",
      guest_name: "Priya Sharma",
      booking_ref: "DJ2026-0415",
      check_in_date: "2026-12-01",
      expected_arrival: "2026-12-02T00:50+09:00",
    },
  },
];
