"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startNewTripAction } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";
import { Taegukgi } from "./Taegukgi";
import { VehicleArt } from "./VehicleArt";

// 입국 오프닝: 공항 활주로 위로 비행기가 내려오고, 태극기와 함께 "대한민국 입국" 도장이 찍힌다.
// 판다와 개구리 마중이가 양쪽에서 인사한다. 한 번 보면 같은 세션에서는 다시 띄우지 않는다.
// Esc나 "이전 여행 이어 보기"는 보드를 그대로 두고 닫는다.
export const INTRO_SEEN_KEY = "majungi-intro-seen";
export const INTRO_REPLAY_EVENT = "majungi:intro";

// hasTrip: 이미 등록된 여행이 있으면 "입국하기"는 빈 보드로 새 여행을 시작하고, "이전 여행 이어 보기"도 보여준다
// languagePicker: 메인 화면 헤더와 같은 자리(오른쪽 위)에 둘 언어 선택 (들어가기 전에 언어를 고를 수 있게)
type Props = {
  m: Messages["intro"];
  ko: Messages["intro"];
  language: string;
  stamp: { date: string; airport: string };
  hasTrip: boolean;
  languagePicker?: React.ReactNode;
};

export function EntryIntro({ m, ko, language, stamp, hasTrip, languagePicker }: Props) {
  const [state, setState] = useState<"show" | "leaving" | "gone">("show");
  const enterRef = useRef<HTMLButtonElement>(null);

  // 이미 본 세션이면 바로 치운다 (첫 화면은 layout의 스크립트가 미리 숨겨 깜빡임이 없다)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY)) setState("gone");
    } catch {
      // 저장소를 못 쓰면 매번 보여준다
    }
    const replay = () => {
      document.documentElement.removeAttribute("data-intro-seen");
      setState("show");
    };
    window.addEventListener(INTRO_REPLAY_EVENT, replay);
    return () => window.removeEventListener(INTRO_REPLAY_EVENT, replay);
  }, []);

  useEffect(() => {
    if (state !== "show") return;
    document.body.style.overflow = "hidden";
    const focus = setTimeout(() => enterRef.current?.focus({ preventScroll: true }), 300);
    return () => {
      clearTimeout(focus);
      document.body.style.overflow = "";
    };
  }, [state]);

  const close = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // 무시
    }
    setState("leaving");
    setTimeout(() => setState("gone"), 760);
  }, []);

  // 입국하기 = 새 여행 시작 (등록된 것이 없으면 그냥 들어간다)
  const enter = useCallback(() => {
    if (hasTrip) void startNewTripAction();
    close();
  }, [hasTrip, close]);

  useEffect(() => {
    if (state !== "show") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  if (state === "gone") return null;

  return (
    <div className={state === "leaving" ? "intro is-leaving" : "intro"} role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro-sky" aria-hidden="true">
        <span className="intro-cloud c1" />
        <span className="intro-cloud c2" />
        <span className="intro-cloud c3" />
        <span className="intro-plane">
          <VehicleArt mode="flight" />
        </span>
        <AirportScene />
      </div>

      <div className="intro-stage">
        <figure className="intro-buddy is-left" aria-hidden="true">
          <figcaption className="intro-say">
            <strong>{m.welcome}</strong>
            {language !== "ko" && <span lang="ko">어서 오세요!</span>}
          </figcaption>
          <img src="/mascot/majung-panda.png" alt="" width={240} height={261} />
        </figure>

        <section className="intro-card">
          <p className="intro-band">
            <span lang="ko">대한민국</span>
            <span>REPUBLIC OF KOREA</span>
          </p>
          <div className="intro-flag">
            <Taegukgi />
          </div>
          <h1 id="intro-title" className="intro-title">
            <span lang="ko">{ko.title}</span>
            {language !== "ko" && <span className="intro-title-local">{m.title}</span>}
          </h1>
          <p className="intro-sub">{m.sub}</p>
          <p className="intro-stamp" aria-hidden="true">
            <span>입국 · ENTRY</span>
            <strong>{stamp.airport}</strong>
            <span className="tabular">{stamp.date}</span>
          </p>
          <button ref={enterRef} type="button" className="button intro-enter" onClick={enter}>
            {m.enter}
            <span className="intro-arrow" aria-hidden="true" />
          </button>
          {/* 입국하기는 지금 보드를 비우고 새 여행을 시작하므로, 기존 여행이 있으면 미리 알린다 */}
          {hasTrip && <p className="intro-warn">{m.newTripNote}</p>}
          {hasTrip && (
            <button type="button" className="intro-resume" onClick={close}>
              {m.resume}
            </button>
          )}
          {/* 이어지는 범위를 정직하게: 여행 보드는 서버 DB에, 채팅은 서버 메모리에 있다 */}
          {hasTrip && <p className="intro-note">{m.resumeNote}</p>}
        </section>

        <figure className="intro-buddy is-right" aria-hidden="true">
          <figcaption className="intro-say">
            <strong>{m.niceTrip}</strong>
            {language !== "ko" && <span lang="ko">즐거운 여행 되세요!</span>}
          </figcaption>
          <img src="/mascot/majung.png" alt="" width={280} height={270} />
        </figure>
      </div>
      {languagePicker && <div className="intro-lang">{languagePicker}</div>}
    </div>
  );
}

// 공항 실루엣: 먼 산, 물결 지붕 터미널, 관제탑, 활주로
function AirportScene() {
  return (
    <svg className="intro-airport" viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice">
      <path d="M0 150 120 110l90 26 110-46 120 40 140-58 130 52 120-30 150 44 130-36 170 50 160-22v180H0Z" fill="#b9d6ee" />
      <path d="M0 170 160 140l140 18 160-34 180 30 200-26 180 28 200-22 220 30v116H0Z" fill="#9fc3e3" />
      {/* 터미널: 물결 모양 지붕 */}
      <path d="M180 196c90-40 180-40 270 0s180 40 270 0 180-40 270 0 180 40 270 0v34H180Z" fill="#e9f2fa" />
      <path d="M180 196c90-40 180-40 270 0s180 40 270 0 180-40 270 0 180 40 270 0" fill="none" stroke="#7fa7c4" strokeWidth="3" />
      <rect x="200" y="200" width="1040" height="30" fill="#cfe2f2" />
      <g stroke="#9bbbd6" strokeWidth="2">
        <path d="M260 204v24M340 204v24M420 204v24M500 204v24M580 204v24M660 204v24M740 204v24M820 204v24M900 204v24M980 204v24M1060 204v24M1140 204v24" />
      </g>
      {/* 관제탑 */}
      <path d="M1290 230V120h14v110Z" fill="#e9f2fa" stroke="#7fa7c4" strokeWidth="2" />
      <path d="M1270 104h54l-8 20h-38Z" fill="#17335c" />
      <path d="M1276 98h42v6h-42Z" fill="#7fa7c4" />
      {/* 활주로 */}
      <rect x="0" y="230" width="1440" height="30" fill="#4b5a6e" />
      <path d="M0 245h1440" stroke="#fff" strokeWidth="3" strokeDasharray="40 30" />
    </svg>
  );
}

// 바닥글의 "오프닝 다시 보기"
export function IntroReplay({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="intro-replay"
      onClick={() => {
        try {
          sessionStorage.removeItem(INTRO_SEEN_KEY);
        } catch {
          // 무시
        }
        window.dispatchEvent(new Event(INTRO_REPLAY_EVENT));
        window.scrollTo({ top: 0 });
      }}
    >
      {label}
    </button>
  );
}
