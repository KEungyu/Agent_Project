import { connection } from "next/server";
import Link from "next/link";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { BEFORE, boardReport } from "@/lib/metrics/report";
import { STATUS_LABELS } from "@/lib/requests/state";
import { loadRequestTypes } from "@/lib/request-types/loader";
import { ReportBars, type Bar } from "./ReportBars";

// 발표용 전/후 비교 화면 (PRD §5·§6). 발표가 한국어라 이 화면은 한국어로만 둔다.
export default async function ReportPage() {
  await connection();
  const db = getDb();
  const board = getCurrentBoard(db);
  const { rows, after, outcomes } = board ? boardReport(db, board.id, board.requests) : { rows: [], after: null, outcomes: { done: 0, conditional: 0, declined: 0 } };
  const types = loadRequestTypes().types;
  const show = (value: number | null | undefined, unit = "") => (value === null || value === undefined ? "—" : `${value}${unit}`);

  const bars: Bar[] = [
    { label: "처리 단계 수", note: "이용자가 직접 한 조작", unit: "", before: BEFORE.steps, after: after?.steps ?? null },
    // 적용 전(예상치)과 적용 후(기록)는 근거가 달라 줄어든 비율(%)은 보여 주지 않는다
    { label: "회신 대기 제외 경과 시간", note: "시작~끝 − 회신 대기 · 직접 조작한 시간 아님", unit: "분", before: BEFORE.activeMinutes, after: after?.activeMinutes ?? null },
    { label: "도구·앱 전환", note: "다른 앱·사이트로 이동", unit: "회", before: BEFORE.toolSwitches, after: after?.toolSwitches ?? null },
    { label: "같은 정보 재질문", note: "보드에 있던 값을 다시 물음", unit: "회", before: BEFORE.reAsks, after: after?.reAsks ?? null },
  ];

  const compare = [
    { label: "처리 단계 수", note: "이용자가 직접 한 조작", before: `${BEFORE.steps}`, after: show(after?.steps) },
    { label: "회신 대기 제외 경과 시간", note: "시작~끝 − 회신 대기 · 직접 조작한 시간 아님", before: `약 ${BEFORE.activeMinutes}분`, after: show(after?.activeMinutes, "분") },
    { label: "도구·앱 전환", note: "다른 앱·사이트로 이동", before: `약 ${BEFORE.toolSwitches}회`, after: show(after?.toolSwitches, "회") },
    { label: "같은 정보 재질문", note: "보드에 있던 값을 다시 물음", before: `${BEFORE.reAsks}회 이상`, after: show(after?.reAsks, "회") },
  ];

  return (
    <>
    <header className="signbar" lang="ko">
      <div className="signbar-inner">
        <Link href="/" className="brand brand-link">
          <span className="brand-roundel brand-mascot" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 마스코트 이미지 */}
              <img src="/mascot/majung-head.png" width={44} height={44} alt="" />
            </span>
          <span>
            <span className="brand-name">
              마중이 <span lang="en">Majungi</span>
            </span>
            <span className="brand-tagline">앱으로 돌아가기</span>
          </span>
        </Link>
      </div>
    </header>
    <main className="platform report" lang="ko">
      <div className="platform-main">
        <h1 className="sign-title sign-title-h2">
          <span className="sign-title-ko">AI 적용 전/후 비교</span>
          <span className="sign-title-text">
            늦은 체크인 문의 기준 · 회신까지 처리된 요청 {rows.length}건 (해결 {outcomes.done} · 조건 충족 전 {outcomes.conditional} · 거절 {outcomes.declined}) · 시연·테스트 기록, 실제 사용자 실측 아님
          </span>
        </h1>

        <section className="sign">
          <h2 className="sign-title sign-title-h3">
            <span className="sign-title-ko">한눈에 보기</span>
            <span className="sign-title-text">적용 전은 예상치, 적용 후는 앱 기록의 평균</span>
          </h2>
          <ReportBars bars={bars} />
        </section>

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
                <th scope="col">적용 후 (이 앱 기록)</th>
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
            적용 전 값은 PRD 예상치이고, 적용 후 값은 이 보드에 남은 시연·테스트 요청(모의 발송, 예시 회신 포함)에서 계산했어요. 실제 사용자 성과가 아니에요.
            적용 후 평균은 결과와 관계없이 회신까지 처리한 요청 전체의 평균(처리에 든 수고)이에요. "해결"은 그 문의가 해결됐다는 뜻이고, 새 예약·실제 투숙·여행 목표 달성을 뜻하지 않아요. 조건 충족 전·거절 건은 해결 건수에 들어가지 않아요. 회신 해석 정확도는 가상 회신으로 따로 재요: <code>npm run eval:replies</code> (목표 85%, 이 화면에는 결과가 나오지 않아요).
          </p>
        </section>

        <section className="sign">
          <h2 className="sign-title sign-title-h3">
            <span className="sign-title-ko">요청별 기록</span>
            <span className="sign-title-text">상태 이력과 이벤트 로그</span>
          </h2>
          {rows.length === 0 ? (
            <p className="empty-note">아직 회신까지 처리된 요청이 없어 계산한 값이 없습니다.</p>
          ) : (
            <table className="report-table report-rows">
              <thead>
                <tr>
                  <th scope="col">요청</th>
                  <th scope="col">결과</th>
                  <th scope="col">조작</th>
                  <th scope="col">대기 제외 경과</th>
                  <th scope="col">회신 대기</th>
                  <th scope="col">재질문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.request_id}>
                    <th scope="row">{types.find((type) => type.id === row.type_id)?.label.ko ?? row.type_id}</th>
                    <td data-label="결과">{STATUS_LABELS[row.status]}{row.status === "conditional" ? " (조건 충족 전)" : ""}</td>
                    <td data-label="조작">{row.steps}</td>
                    <td data-label="대기 제외 경과">{row.activeMinutes}분</td>
                    <td data-label="회신 대기">{row.waitingMinutes}분</td>
                    <td data-label="재질문">{row.reAsks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
    </>
  );
}
