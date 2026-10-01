# AGENTS.md — 마중 프로젝트 작업 규칙

이 파일은 이 저장소에서 코드를 쓰는 모든 AI 에이전트와 팀원에게 적용된다.

## 기준 문서
- [concept.md](concept.md) — 서비스 컨셉 원본
- [docs/PRD.md](docs/PRD.md) — 범위, 목표·비목표, 지표
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 에이전트 루프, 도구, 데이터 모델, 상태 머신
- [docs/BACKLOG.md](docs/BACKLOG.md) — 단계별 작업과 완료 기준

문서와 지시가 충돌하면 작업을 멈추고 어느 쪽을 따를지 묻는다.

---

## 작업 규칙 (필수)

### 1. 한 번에 BACKLOG의 한 단계만 수행한다
- 지시받은 단계 ID(예: `M5`) 하나만 작업한다. 끝나도 다음 단계를 스스로 시작하지 않는다.
- 단계의 "작업"과 "완료 기준"에 없는 기능은 만들지 않는다. 필요해 보이면 보고에 제안으로만 적는다.

### 2. 요청 범위 밖의 파일을 수정하지 않는다
- 그 단계에 필요한 파일만 만들거나 고친다.
- 관련 없는 리팩터링, 포맷 정리, 이름 변경, 주석 손질을 하지 않는다.
- 다른 담당자(A/B)의 영역 파일을 고쳐야 하면 멈추고 확인을 요청한다.

### 3. 비밀 키는 `.env`에서만 읽고 커밋하지 않는다
- API 키, 메일 계정 비밀번호 등은 `.env`에서만 읽는다.
- 키 값을 코드, 문서, 테스트 픽스처, 로그, 오류 메시지에 쓰지 않는다. 키가 없을 때는 **키 이름만** 알린다.
- `.env`는 `.gitignore`에 포함한다. `.env.example`에는 키 이름과 설명만 적는다.

### 4. 다음 작업 전에는 멈추고 확인을 요청한다
아래 중 하나라도 해당하면 실행하기 전에 **이유, 대안, 영향 범위**를 적고 승인을 기다린다.
- 의존성 추가, 제거, 버전 변경
- 파일 삭제 (이동과 이름 변경 포함)
- DB·저장소 스키마 변경 (여행 보드·요청·이벤트 모델의 필드 추가·삭제·이름 변경, 요청 유형 스키마 변경 포함)

### 5. 단계를 마치면 실행 방법과 확인 결과를 보고한다
아래 형식으로 보고한다. 완료 기준을 실제로 실행하지 않았으면 "완료"라고 쓰지 않는다.

```markdown
## [단계 ID] 보고
- 변경 파일: (경로 목록)
- 실행 방법: (그대로 복사해 실행할 수 있는 명령)
- 완료 기준 확인:
  - [x] 기준 1 — 실행 결과 요약
  - [ ] 기준 2 — 실패 / 미확인 사유
- 남은 문제·제안: (없으면 "없음")
```

---

## 제품 불변 조건 (코드로 지킨다)

docs의 확정 결정 중 코드에서 깨지기 쉬운 것들이다. 어떤 단계에서도 어기지 않는다.

1. **외부 발송은 이용자 승인 후에만.** 승인 검사는 발송 함수 안에서 코드로 한다. LLM의 판단에 맡기지 않는다 (ARCHITECTURE §3 승인 게이트).
2. **개발·시연 중 실제 업체로 보내지 않는다.** 기본은 모의 발송이다. 실제 발송은 팀 소유 주소 허용 목록으로만 한다.
3. **긴급 상황은 대행하지 않는다.** 112·119·1330을 먼저 보여준다. 행정 질문은 범위 밖으로 안내하고 1345를 보여준다.
4. **요청 유형은 데이터로 정의한다.** 코드에 유형별 분기(`if type == "late_checkin"` 등)를 두지 않는다.
5. **개인정보는 필요한 것만 저장한다.** 예약 메일 원문은 추출 후 버린다. 여권번호·카드번호는 요청하지 않는다.
6. **"확정"(결제·본인인증 포함 예약)은 구현하지 않는다.** 실행 단계 배지는 안내 / 준비 / 대행만 쓴다.
7. **요청 상태 변경은 모두 시각과 행위자를 기록한다.** 전/후 지표 산출에 쓴다.

---

## Git
- 브랜치 이름은 BACKLOG에 적힌 것을 쓴다. 형식은 `<종류>/<단계ID>-<짧은-이름>`이다.
- 한 브랜치에는 한 단계의 변경만 담는다.
- 커밋, 푸시, 병합은 팀원이 지시할 때만 한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
