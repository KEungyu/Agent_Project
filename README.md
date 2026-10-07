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
| `BOOKING_DEMAND_TOKEN`, `BOOKING_AFFILIATE_ID` | Booking.com Demand API 어댑터용. 제휴·계약 필요. 현재 에이전트는 공식 홈 연결만 제공하며, 키 입력만으로 실제 검색이 연결되지는 않음 |

## 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (http://localhost:3000) |
| `npm test` | 테스트 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run eval:replies` | 회신 해석 검사 (실제 LLM) |
| `npm run qa:scenarios` | 대화 시나리오 검사 (실제 LLM, 고정 시각, 모의 발송) |
| `npm run qa:browser` | 화면 검사 (빌드 후, 헤드리스 Chrome) |

`qa:browser -- --chat`은 실제 LLM, `--live`는 실제 ODsay를 추가로 호출한다. 기본 화면 검사도 장소 검색에는 실제 OpenStreetMap Nominatim을 쓴다. 검사 DB·발송함은 임시이고 메일은 모의 발송이다. `eval:replies`와 `qa:scenarios`는 제공사 한도를 사용한다.

## 현재 지원 범위와 확인 기록

- [3차 피드백 최종 결과 — 2026-10-07](docs/QA-feedback3-2026-10-07.md): 실제 ODsay·회신 평가·최종 화면 검증 결과.
- [2026-10-06 후속 검증 보고](docs/QA-feedback2-followup-2026-10-06.md): 단계별 수정·실행 결과·외부 설정 한계. 과거 실행과 현재 확인을 구분한다.
- [전후 Workflow·측정 및 관찰 양식](docs/EVAL-workflow.md): 실제 참여자 관찰은 아직 0건이다.
- 공항 출발 일시를 경로 화면에서 입력·확인하면 ODsay `subwayPathSchedule`로 역 간 시간표·요금을 조회한다. 첫차·막차 대체 결과는 별도 안내하며, 00~04시 출발은 운행일 기준 미확인으로 조회를 보류한다. 공항 안 걷는 시간·호텔까지 이동은 포함하지 않고 호텔 도착은 자동 저장하지 않는다. 10/07 실제 정상 경로·첫차 대체·역 시간표 및 최종 화면 대조를 완료했다.
- 조건부 문의는 최신 회신의 조건 이행과 기한을 각각 확인해야 해결로 표시한다. 외부 예약 결과는 조건을 확인한 **이용자 기록**이며 공급자 검증·앱의 예약 확정이 아니다.
- 화면을 새로고침하면 보드와 현재 서버의 대화를 다시 읽는다. 서버 재시작 시 메모리 대화는 사라진다. 무료 시연 서버의 임시 저장소는 보드까지 초기화될 수 있다.
