> 최종 전체 실행(커밋 전 검증). T04-zh-CN·B02는 초안 작성 중 Gemini 503(모든 모델 지연)으로 초안이 만들어지지 않아 실패했고, 마중이는 '지금은 만들 수 없다'고 안내했다. 두 검사는 오류 내용을 남기도록 스크립트를 보강한 뒤 다시 실행했다(scenarios.md).

# 대화 시나리오 실행 기록 (실제 LLM)

- 코드: e798b9e + 커밋 전 변경 · Node v24.18.0
- LLM: gemini · gemini-3.1-flash-lite (예비: gemini-3.5-flash, gemini-3.8-flash)
- 발송 모드: mock (실제 발송 없음) · 가상 예약: Review Test Hotel (fictional) / REVIEW-ONLY
- 고정 시각: 여행 전 2026-10-08T12:00:00+09:00, 체크인 날 밤 2026-10-09T21:00:00+09:00
- 시작: 2026-10-04T11:32:57.461Z · 실행 검사: T02, T04-ja, T04-zh-CN, T06, T07, B01, B02, C01, C02, C03, D10

### T02 저장 숙소 재사용 + 자정 날짜 (en, 기준 2026-10-08 12:00 KST)
  · 도구: board_get, check_conditions, draft_request
  · 답: I wrote a Korean message to Review Test Hotel (fictional). Check the Korean and the translation under Requests, then send it or ask for changes. Nothing's been sent yet. ⏎ Check-in date: Fri, Oct 9, 2026 · Arrival at the stay: Sat, Oct 10, 2026, 01:00 KST
  PASS 숙소 1개
  PASS 요청 1개·승인 대기·발송 없음
  PASS 미입력 값(Seoul Hotel/ABC12345) 없음
  PASS 원문: 체크인 2026년 10월 9일 / 도착 2026년 10월 10일 01:00 KST
  PASS 보드 날짜 유지
  PASS 번역에 연도·01:00·KST
  PASS 한국어 능력 언급 없음
  PASS 답에 내부 이름·요청 ID 없음
  · 원문: 안녕하세요. Review Test Hotel에 예약한 투숙객입니다. 늦은 체크인에 대해 문의드리고자 합니다. 예약자명은 Test Guest이며, 예약번호는 REVIEW-ONLY입니다. 체크인 날짜는 2026년 10월 9일(금)이고, 도착 예정 시각은 2026년 10월 10일(토) 01:00(KST)입니다. 해당 시간에 늦은 체크인이 가능한지 확인 부탁드립니다. 또한 프런트 마감 후 출입 방법이 어떻게 되는지 안내해 주시면 감사하겠습니다. 이메일로 답변 부탁드립니다.

### T04-ja 좁은 수정 (ja, 요청 카드 '고쳐 주세요' 경로)
  · 도구: board_get, check_conditions, draft_request
  · 답: Review Test Hotel (fictional)あての韓国語メッセージを書いておきました。リクエスト欄で韓国語と訳を確認して、送るか直してほしいところを教えてください。まだ何も送っていません。 ⏎ チェックイン日: 2026年10月9日(金) · 宿への到着: 2026年10月10日(土) 01:00 KST
  PASS 채팅 메시지에 요청 ID·내부 지시문 없음
  · 도구: board_update(오류), board_update, draft_request
  · 답: Review Test Hotel (fictional)あてのメッセージをご希望どおり直しました。送る前に依頼カードで新しい内容を確認してください。 ⏎ チェックイン日: 2026年10月9日(金) · 宿への到着: 2026年10月10日(土) 02:00 KST
  PASS 요청 1개·숙소 1개·승인 대기
  PASS 보드: 도착만 02:00, 체크인·체크아웃 유지
  PASS 원문 02:00, 01:00 없음, 2026년 10월 9일 유지
  PASS 수신처 유지
  PASS 번역 제목 件名:
  · 수정 전 문장 7개 중 6개 유지
  PASS 답에 내부 이름 없음

### T05 재번역 (ja → zh-CN)
  PASS 원문·해시·보드 그대로
  PASS 번역 언어 zh-CN, 제목 主题:

### T04-zh-CN 좁은 수정 (zh-CN, 요청 카드 '고쳐 주세요' 경로)
  · 도구: board_get, check_conditions, draft_request(오류)
  · 답: 抱歉，由于系统繁忙，无法立即生成草稿。请稍后再试。
  FAIL 실행 오류 없이 끝남 — Cannot read properties of undefined (reading 'draft')

### T06 오늘에 묶은 지난 새벽 시각 (ko, 기준 2026-10-09 21:00 KST)
  · 도구: board_get, check_conditions, board_update
  · 답: 혹시 오늘 밤을 지나 내일 새벽 2시(2026-10-10 02:00 KST)에 도착하시는 것이 맞나요? 맞다면 호텔에 늦은 체크인을 요청하는 메일을 바로 작성해 드릴게요.
  PASS 날짜를 확정하지 않음 (요청 없음, 도착 미저장)
  · 도구: board_update, check_conditions, draft_request
  · 답: Review Test Hotel (fictional)에 보낼 한국어 메시지를 써 뒀어요. 요청 칸에서 한국어 원문과 번역을 확인하고, 보내거나 고쳐 달라고 해 주세요. 아직 아무것도 안 보냈어요. ⏎ Review Test Hotel (fictional)에 5시간 뒤 도착하는데 여행 보드에 전화번호가 없어서 메일로만 보낼 수 있어요. 답이 늦을 수 있어요. 전화번호를 알면 추가해 주세요. ⏎ 체크인 날짜: 2026년 10월 9일 (금) · 숙소 도착: 2026년 10월 10일 (토) 02:00 KST
  PASS 확인 뒤 10-10 02:00 저장·초안

### T07 공항 도착과 호텔 도착 구분 (en, 기준 2026-10-08 12:00 KST)
  · 도구: board_update, board_get, board_update, check_conditions, draft_request
  · 답: I wrote a Korean message to Review Test Hotel (fictional). Check the Korean and the translation under Requests, then send it or ask for changes. Nothing's been sent yet. ⏎ Check-in date: Fri, Oct 9, 2026 · Arrival at the stay: Sat, Oct 10, 2026, 01:00 KST
  PASS 호텔 도착 10-10 01:00 저장
  PASS 원문에 01:00, 23:10 없음
  PASS 항공편 도착 23:10 유지

### B01 새 숙소 예약 → Booking.com 연결 (en)
  · 도구: prepare_stay_booking
  · 답: Here's Booking.com. Search there with these details and finish the booking on their site. Nothing is booked yet.
  PASS prepare_stay_booking 성공
  PASS 메일 요청·식당 연결 없음
  PASS 기존 숙소 그대로
  PASS 예약번호를 묻지 않음

### B02 기존 예약 늦은 체크인 → 기존 요청 흐름 (en)
  · 도구: board_get, check_conditions, draft_request(오류)
  · 답: It seems I am currently experiencing a temporary technical issue. Please bear with me, and I will draft the message for your late check-in at Review Test Hotel (fictional) for 2026-10-10 01:00 KST momentarily.
  PASS Booking.com·Catchtable 연결 없음
  FAIL 늦은 체크인 요청 1개 승인 대기

### D07 기존 호텔 늦은 체크인 → 새 예약·덮어쓰기 없음
  PASS 숙소 1개, 이름·예약번호·날짜 그대로

### C01 'Please book a restaurant for two tomorrow at 7 pm.' → Catchtable 연결
  · 도구: open_restaurant_booking
  · 답: Opening Catchtable in English. Choose the restaurant and confirm the reservation there.
  PASS open_restaurant_booking 성공
  PASS 호텔 예약 경로·메일 초안 없음
  PASS 요청·발송 없음

### C02 'Take me to Catchtable in English.' → 질문 없이 연결
  · 도구: open_restaurant_booking
  · 답: Opening Catchtable in English. Choose the restaurant and confirm the reservation there.
  PASS open_restaurant_booking 성공
  PASS 조건 질문(ask_user) 없음

### C03 추천 / 예약하지 마 / 취소 → 예약 화면 열지 않음
  · 도구: board_get
  · 답: Myeongdong is a vibrant area with many great food options! Here are a few popular types of restaurants you might enjoy: ⏎  ⏎ *   **Myeongdong Kyoja (명동교자):** Famous for their *kalguksu* (knife-cut noodle soup) and *mandu* (dumplings). It's a classic local spot. ⏎ *   **Wangbijib (왕비집):** A great place to try Korean BBQ, known for its high-quality cuts of meat. ⏎ *   **Hadongkwan (하동관):** Excellent for *gomtang* (beef bone soup), a comforting and traditional Korean meal. ⏎  ⏎ Please note that these are very popular, so there might be a queue depending on the time. Prices and operating hours can change, so it's a good idea to check their current status online or ask at your hotel front desk for their latest recommendations! ⏎  ⏎ Would you like me to open the restaurant booking site for you, or do you have a specific cuisine in mind?
  PASS "Recommend restaurants near Myeongdong." → 예약 연결·요청 없음
  · 도구: 없음
  · 답: Korean BBQ is a popular dining experience where you cook various cuts of meat—most commonly pork belly (*samgyeopsal*) or marinated beef (*bulgogi*)—right at your table on a charcoal or gas grill.  ⏎  ⏎ It is usually served with an assortment of side dishes (*banchan*), such as kimchi, seasoned vegetables, and dipping sauces. A classic way to eat it is to take a piece of grilled meat, dip it in sauce, place it on a fresh lettuce or perilla leaf, add a slice of raw or grilled garlic and some kimchi, and wrap it all into a single bite (*ssam*). It is a very social and interactive meal!
  PASS "Do not book a restaurant, just tell me what Korean BBQ is." → 예약 연결·요청 없음
  · 도구: 없음
  · 답: I'm sorry, I cannot cancel restaurant reservations. Please cancel your booking directly through the platform or restaurant where you made the reservation.
  PASS "Cancel my restaurant reservation." → 예약 연결·요청 없음

### D10 식당 지점 연락처와 숙소 연락처가 함께 있을 때 식당 것만 사용
  · 도구: check_conditions, draft_request
  · 답: I wrote a Korean message to Mingles, Cheongdam branch. Check the Korean and the translation under Requests, then send it or ask for changes. Nothing's been sent yet. ⏎ Reservation: Sat, Oct 10, 2026, 19:00 KST · People: 2
  PASS restaurant_booking 요청이 승인 대기
  PASS 수신처는 식당 주소, 숙소 메일 아님
  PASS 알레르기 내용을 원문에 담음
  PASS 안전 보장 표현 없음
  PASS 답에 내부 이름 없음
  · 원문: 안녕하세요, 식당 예약 문의드립니다. 예약자명은 Emma Smith이며, 2026년 10월 10일(토) 19:00(KST)에 2명 예약하고 싶습니다. 참고로 일행 중에 땅콩 알레르기(peanut allergy)가 있습니다. 예약 가능 여부를 회신해 주시면 감사하겠습니다.

## 요약
- T02: 통과 (PASS 8, FAIL 0)
- T04-ja: 통과 (PASS 7, FAIL 0)
- T05: 통과 (PASS 2, FAIL 0)
- T04-zh-CN: 실패 (PASS 0, FAIL 1)
- T06: 통과 (PASS 2, FAIL 0)
- T07: 통과 (PASS 3, FAIL 0)
- B01: 통과 (PASS 4, FAIL 0)
- B02: 실패 (PASS 1, FAIL 1)
- D07: 통과 (PASS 1, FAIL 0)
- C01: 통과 (PASS 3, FAIL 0)
- C02: 통과 (PASS 2, FAIL 0)
- C03: 통과 (PASS 3, FAIL 0)
- D10: 통과 (PASS 5, FAIL 0)
