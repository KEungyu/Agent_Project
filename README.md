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
cp .env.example .env   # 값 채우기 (키는 커밋 금지)
npm run dev            # http://localhost:3000
```

## 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (http://localhost:3000) |
| `npm test` | 테스트 실행 |
| `npm run build` | 프로덕션 빌드 |
