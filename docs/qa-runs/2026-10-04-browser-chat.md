# 브라우저 검사 기록 (헤드리스 Chrome · 프로덕션 빌드)

- 코드: 7c73c88 + 커밋 전 변경 · Node v24.18.0 · 발송 모드 mock (임시 발송함) · 가상 예약(데모 보드)
- 시작: 2026-10-04T10:35:26.834Z

- PASS 승인 E (정상 승인) — 발송함 +1, 상태 awaiting_reply
- PASS 승인 F (빠른 중복 클릭) — 발송함 +1
- PASS 승인 A (본문 V1→V2) — 안내 "This message changed after you opened it (text, recipient or booking details). Nothing was sent. Check the latest version below and approve again.", 발송함 +0
- PASS 승인 B (수신처 A→B) — 안내 "This message changed after you opened it (text, recipient or booking details). Nothing was sent. Check the latest version below and approve again.", 발송함 +0
- PASS A06·승인 C (숙소 도착 시각 변경 후 예전 초안) — 저장된 도착 2026-10-20T03:30+09:00, 안내 "This message changed after you opened it (text, recipient or booking details). Nothing was sent. Check the latest version below and approve again.", 발송함 +0
- PASS A09 (출발 공항 충돌) — Gimpo GMP | Your board says you leave from Gimpo. This guide shows Incheon.
- PASS N08 (390px 경로·키보드 이동·가로 넘침 없음) — {"legs":2,"moved":true,"overflow":false,"note":"Times & fares\n\nTimes, fares and buses need a transit data service (ODsay) that i"}
- PASS N06 (경로 시간·요금: 자격 없음 안내) — Times & fares

Times, fares and buses need a transit data service (ODsay) that i
- PASS N06 (버스 정류장: 자격 없음 안내, 가짜 정류장 없음) — Bus stop lists need the transit data service (ODsay), which isn't connected yet. Majungi doesn't make up stops.
- PASS N08 (한국어 화면) — 지하철 노선도 / 도착
- PASS C05 (새 탭 1회, opener 끊음) — {"card":true,"opens":["https://www.catchtable.net/"],"opener":[null],"opened":"Opened in a new tab."}
- PASS C06·C08 (새로고침 뒤 다시 열지 않음, 카드 유지, 390px 가로 넘침 없음) — {"card":true,"opens":0,"overflow":false}

요약: 통과 12 / 12
