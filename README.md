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
| `NEXT_PUBLIC_ODSAY_WEB_KEY` | 도메인 제한을 사용하는 ODsay **WEB/URI** 플랫폼 키. 설정하면 지하철 조회는 브라우저에서 직접 수행하며 서버 조회를 중복 실행하지 않음. 서버 키를 넣으면 안 됨. 설정 변경 후 다시 빌드 필요 |
| `NEXT_PUBLIC_ODSAY_MULTILANG` | WEB 플랫폼의 유료 다국어 계약이 확인된 경우만 `1`. Basic에서는 비워 두며 기존 앱 번역·역 이름 표시를 사용 |
| `DATA_GO_KR_SERVICE_KEY` | 인천공항 실시간 운항 (공공데이터포털 "인천국제공항공사_여객편 운항현황(다국어)") |
| `BOOKING_DEMAND_TOKEN`, `BOOKING_AFFILIATE_ID` | Booking.com Demand API 어댑터용. 제휴·계약 필요. 현재 에이전트는 공식 홈 연결만 제공하며, 키 입력만으로 실제 검색이 연결되지는 않음 |

### Render 공유 IP에서 ODsay 연결

서버 키는 호출 서버의 공인 IP가 등록돼야 한다. Render 공유 발신 **범위**의 시작 주소 하나를 ODsay에 등록해도 범위 전체가 허용되지는 않는다. ODsay의 [동일 Render 사례 안내](https://lab.odsay.com/community/boardView?seq=735)는 IP 대역 등록 대신 도메인 등록과 WEB 프론트엔드 호출을 제시한다. 유료 전용 IP 없이 이 방식을 쓸 수 있도록 조회 경계를 추가했다.

1. 기존 ODsay 앱의 URI에 **`majungi.onrender.com`**을 등록한다. 등록 입력에는 `https://`, 경로, 끝 슬래시를 넣지 않는다. 기존 서버 IP나 키는 삭제하지 않는다.
2. 등록 저장 후 개요에서 **WEB/URI 플랫폼 키**가 발급됐는지 확인한다. 로그인·URI 입력만으로 인증 성공을 판정하지 않는다.
3. 소유자가 Render의 해당 서비스 Environment에 `NEXT_PUBLIC_ODSAY_WEB_KEY`를 설정한다. 서버용 `ODSAY_API_KEY`를 복사하지 않는다. WEB 키는 브라우저에 포함되는 공개 클라이언트 키이므로 ODsay에서 허용 도메인을 제한해야 한다. 키 값을 코드·문서·로그로 옮기지 않는다.
4. 변수를 적용한 **새 빌드와 배포**가 필요하다. 재시작만 하면 이전 빌드의 `NEXT_PUBLIC_` 값이 남는다. Basic에서는 다국어 플래그를 켜지 않는다.
5. 배포된 공식 도메인에서 일반 경로(`searchPubTransPathT`), 막차 시간표(`searchSubwaySchedule`), 역 검색(`searchStation`), 지정 시각 경로(`subwayPathSchedule`)가 성공하는지 한도 내에서 확인한다. 임의 Origin/Referer나 프록시로 인증을 우회하지 않는다.

WEB 키가 없는 환경은 기존 서버 방식을 사용한다. WEB 방식에서 인증 실패가 나도 서버 방식으로 자동 재시도하지 않는다. 같은 진행 중 조회는 공유하고 성공만 잠시 캐시한다. Basic 30회/일은 기능을 누르는 횟수와 다르다. 지정 시각 조회는 처음에 역 검색 2회와 경로 1회, 일반 조회는 경로와 추천 경로의 각 구간 시간표를 사용한다. 한도·인증 실패 시 멈추고 기존 공식 링크 안내를 쓴다.

로컬 테스트는 실제 WEB 인증·CORS·Render 화면 성공과 구분한다. 로컬 브라우저 실호출에는 제공사가 허용하는 로컬 도메인 등록도 필요하다. 현재 코드 수정·검사와 운영 미확인 사항은 [WEB 연결 후속 검증 보고](docs/QA-web-2026-10-07.md)에 기록한다.

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
