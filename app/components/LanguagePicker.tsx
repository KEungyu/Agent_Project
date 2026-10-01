"use client";

import { useRef, useTransition } from "react";
import { setLanguage } from "@/app/actions";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { Flag } from "./Flag";

// 헤더의 국기 버튼과 펼침 패널. 고른 언어는 보드에 저장되어 화면, 마중 답변, 역번역에 함께 쓰인다.
export function LanguagePicker({ current, title }: { current: Language; title: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  const choose = (code: Language["code"]) => {
    panelRef.current?.hidePopover();
    if (code === current.code) return;
    // 언어를 바꿀 때만 안내판 글자가 넘김판처럼 바뀐다 (처음 접속할 때는 연출하지 않는다)
    const root = document.documentElement;
    root.dataset.langSwap = "1";
    startTransition(async () => {
      await setLanguage(code);
      setTimeout(() => delete root.dataset.langSwap, 1400);
    });
  };

  return (
    <>
      <button
        type="button"
        className="lang-button"
        popoverTarget="language-panel"
        aria-label={`${title}: ${current.nativeName}`}
        aria-busy={pending}
      >
        <Flag flag={current.flag} />
        <span className="lang-button-name">{current.nativeName}</span>
        <svg className="lang-chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={panelRef} id="language-panel" popover="auto" className="lang-panel" role="dialog" aria-label={title}>
        <p className="lang-panel-title">
          <span lang="ko">언어</span>
          {title !== "언어" && <span>{title}</span>}
        </p>
        <ul className="lang-grid">
          {LANGUAGES.map((language) => {
            const selected = language.code === current.code;
            return (
              <li key={language.code}>
                <button
                  type="button"
                  className="lang-option"
                  aria-pressed={selected}
                  lang={language.code}
                  onClick={() => choose(language.code)}
                >
                  <Flag flag={language.flag} size={28} />
                  <span className="lang-option-text">
                    <span className="lang-option-native">{language.nativeName}</span>
                    <span className="lang-option-english" lang="en">
                      {language.englishName}
                    </span>
                  </span>
                  {selected && (
                    <svg className="lang-check" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
