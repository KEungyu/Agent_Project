import { connection } from "next/server";
import Link from "next/link";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { BEFORE, boardReport } from "@/lib/metrics/report";
import { STATUS_LABELS } from "@/lib/requests/state";
import { loadRequestTypes } from "@/lib/request-types/loader";

// 발표용 전/후 비교 화면 (PRD §5·§6). 발표가 한국어라 이 화면은 한국어로만 둔다.
export default async function ReportPage() {
  await connection();
  const db = getDb();
  const board = getCurrentBoard(db);
  const { rows, after } = board ? boardReport(db, board.id, board.requests) : { rows: [], after: null };
  const types = loadRequestTypes().types;
  const show = (value: number | null | undefined, unit = "") => (value === null || value === undefined ? "—" : `${value}${unit}`);

  const compare = [
    { label: "처리 단계 수", note: "이용자가 직접 한 조작", before: `${BEFORE.steps}`, after: show(after?.steps) },
    { label: "능동 소요 시간", note: "회신 대기 시간 제외", before: `약 ${BEFORE.activeMinutes}분`, after: show(after?.activeMinutes, "분") },
    { label: "도구·앱 전환", note: "다른 앱·사이트로 이동", before: `약 ${BEFORE.toolSwitches}회`, after: show(after?.toolSwitches, "회") },
    { label: "같은 정보 재질문", note: "보드에 있던 값을 다시 물음", before: `${BEFORE.reAsks}회 이상`, after: show(after?.reAsks, "회") },
  ];

  return (
    <main className="platform report" lang="ko">
      <div className="platform-main">
        <header className="report-head">
          <h1 className="sign-title sign-title-h2">
            <span className="sign-title-ko">AI 적용 전/후 비교</span>
            <span className="sign-title-text">늦은 체크인 문의 기준 · 완료된 요청 {rows.length}건</span>
          </h1>
          <Link href="/" className="button-quiet">
            앱으로 돌아가기
          </Link>
        </header>

        <section className="sign">
          <h2 className="sign-title sign-title-h3">
            <span className="sign-title-ko">지표</span>
            <span className="sign-title-text">적용 전은 {BEFORE.source}, 적용 후는 앱 기록에서 계산한 평균</span>
          </h2>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">지표</th>
                <th scope="col">적용 전 (예상치)</th>
                <th scope="col">적용 후 (실측)</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label}
                    <span>{row.note}</span>
                  </th>
                  <td>{row.before}</td>
                  <td className="report-after">{row.after}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  회신 해석
                  <span>이용자 확인이 필요했던 회신 / 전체 회신</span>
                </th>
                <td>이용자가 직접 번역·판단</td>
                <td className="report-after">{after?.replies ? `${after.repliesNeedingUser} / ${after.replies}` : "—"}</td>
              </tr>
            </tbody>
          </table>
          <p className="report-note">
            회신 해석 정확도는 가상 회신 20개로 따로 잰다: <code>npm run eval:replies</code> (목표 85%).
          </p>
        </section>

        <section className="sign">
          <h2 className="sign-title sign-title-h3">
            <span className="sign-title-ko">요청별 기록</span>
            <span className="sign-title-text">상태 이력과 이벤트 로그</span>
          </h2>
          {rows.length === 0 ? (
            <p className="empty-note">아직 완료된 요청이 없습니다.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">요청</th>
                  <th scope="col">결과</th>
                  <th scope="col">조작</th>
                  <th scope="col">능동 시간</th>
                  <th scope="col">회신 대기</th>
                  <th scope="col">재질문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.request_id}>
                    <th scope="row">{types.find((type) => type.id === row.type_id)?.label.ko ?? row.type_id}</th>
                    <td>{STATUS_LABELS[row.status]}</td>
                    <td>{row.steps}</td>
                    <td>{row.activeMinutes}분</td>
                    <td>{row.waitingMinutes}분</td>
                    <td>{row.reAsks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
