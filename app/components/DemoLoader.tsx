"use client";

import { useRef, useState, useTransition } from "react";
import { loadDemoAction } from "@/app/actions";

export function DemoLoader({ boardId, realMail }: { boardId: string | null; realMail: boolean }) {
  const [pending, startTransition] = useTransition();
  const running = useRef(false);
  const [message, setMessage] = useState<{ text: string; boardId?: string }>({ text: "" });

  function load() {
    if (running.current) return;
    running.current = true;
    setMessage({ text: "" });
    startTransition(async () => {
      try {
        const result = await loadDemoAction(boardId);
        setMessage(result.ok
          ? { text: "시연 준비 완료 · Emma Smith의 새 여행을 불러왔습니다.", boardId: result.boardId }
          : { text: result.error });
      } catch {
        setMessage({ text: "연결을 확인하고 다시 눌러 주세요." });
      } finally {
        running.current = false;
      }
    });
  }

  return (
    <section className="demo-loader" aria-label="시연 준비" lang="ko">
      <button className="button-quiet" type="button" onClick={load} disabled={pending} aria-busy={pending}>
        {pending ? "불러오는 중…" : "시연 데이터 불러오기"}
      </button>
      <p>가상 예약·항공편·일정을 새 여행으로 불러옵니다. 기존 기록은 보존되며, 화면은 영어로 바뀝니다.</p>
      <p>{realMail ? "실제 메일 모드 · 설정된 시험 수신처를 사용합니다. 초안을 승인해야 메일이 발송됩니다." : "모의 발송 모드 · 메일은 실제로 전달되지 않습니다."}</p>
      <p role="status">{message.boardId && message.boardId !== boardId ? "" : message.text}</p>
    </section>
  );
}
