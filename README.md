# 마중

한국 도착 전부터 출국까지, 옆에서 챙기고 대신 처리해 주는 여행 비서 (업무용 AI Agent 과제).

- 컨셉: [concept.md](concept.md)
- 설계: [docs/PRD.md](docs/PRD.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/BACKLOG.md](docs/BACKLOG.md)
- 작업 규칙: [AGENTS.md](AGENTS.md)

## 요구 환경
- Node.js 20 이상 (개발 환경: Node 24)

## 시작하기

```bash
npm install
# 프로젝트 폴더에 .env 파일을 만들고 아래 키 이름에 값을 넣는다 (키는 커밋 금지)
npm run dev            # http://localhost:3000
```

### `.env` 키 이름

비어 있는 키는 그 기능을 끄고 "연결 안 됨" 안내를 보여 준다. 값은 이 문서나 코드에 쓰지 않는다.

| 이름 | 용도 |
|---|---|
| `GEMINI_API_KEY` 또는 `ANTHROPIC_API_KEY` | 마중이 AI (둘 중 하나 필수. `LLM_PROVIDER`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`로 고를 수 있음) |
| `MAIL_MODE` | `mock`(기본, 모의 발송) 또는 `real` |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_ALLOWLIST` | 실제 메일 (`MAIL_MODE=real`일 때만, 허용 목록의 팀 주소로만 발송) |
| `ODSAY_API_KEY` | 지하철 경로의 시간·요금·막차 (ODsay **서버** 플랫폼 키, 실행하는 컴퓨터·서버의 공인 IP 등록 필요). 유료 다국어 요금제면 `ODSAY_MULTILANG=1` |
| `DATA_GO_KR_SERVICE_KEY` | 인천공항 실시간 운항 (공공데이터포털 "인천국제공항공사_여객편 운항현황(다국어)") |
| `BOOKING_DEMAND_TOKEN`, `BOOKING_AFFILIATE_ID` | Booking.com Demand API (제휴 승인 후. 기본 샌드박스, 운영은 `BOOKING_DEMAND_ENV=production`과 `BOOKING_DEMAND_ALLOW_PRODUCTION=1`) |

## 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (http://localhost:3000) |
| `npm test` | 테스트 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run eval:replies` | 회신 해석 검사 (실제 LLM) |
| `npm run qa:scenarios` | 대화 시나리오 검사 (실제 LLM, 고정 시각, 모의 발송) |
| `npm run qa:browser` | 화면 검사 (빌드 후, 헤드리스 Chrome) |
