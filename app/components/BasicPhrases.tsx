"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { Messages } from "@/lib/i18n/messages";
import { PHRASE_GROUPS, PHRASE_KO, PHRASE_SOUND, type PhraseGroup, type PhraseKey } from "@/lib/phrases/basic";
import { ChatIcon, PhoneIcon, SirenIcon, SpeakerIcon } from "./icons";
import { SignTitle } from "./SignTitle";

// 기초 회화: 인사·생활·위급 상황에 쓰는 한국어를 이용자 언어의 글자로 적은 발음과 함께 보여준다.
// 카드를 누르면 브라우저 음성으로 한국어를 읽어 준다(음성을 못 쓰는 브라우저에서는 스피커 표시를 숨긴다).
// 위급 탭은 대신 연락하지 않고 112·119·1330 번호를 먼저 보여준다.

const GROUPS = Object.keys(PHRASE_GROUPS) as PhraseGroup[];
const GROUP_KO: Record<PhraseGroup, string> = { greet: "인사", daily: "생활", emergency: "위급" };
const SOS = [
  { number: "112", key: "n112" },
  { number: "119", key: "n119" },
  { number: "1330", key: "n1330" },
] as const;

export function BasicPhrases({ language, m, safety }: { language: LanguageCode; m: Messages["phrases"]; safety: Messages["safety"] }) {
  const [group, setGroup] = useState<PhraseGroup>("greet");
  const [speaking, setSpeaking] = useState<PhraseKey | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = (key: PhraseKey) => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(PHRASE_KO[key].replace(" / ", ". "));
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    const voice = synth.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith("ko"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking((current) => (current === key ? null : current));
    utterance.onerror = () => setSpeaking(null);
    setSpeaking(key);
    synth.speak(utterance);
  };

  const sounds = language === "ko" ? undefined : PHRASE_SOUND[language];
  return (
    <section className="panel phrases" aria-labelledby="phrases-heading">
      <SignTitle id="phrases-heading" ko="기초 회화" text={m.title} icon={<ChatIcon />} />
      <div className="sign phrases-sign">
        <p className="phrases-sub">{canSpeak ? `${m.sub} ${m.tapToHear}` : m.sub}</p>
        <div className="phrase-tabs" role="tablist" aria-label={m.title} style={{ "--tab": GROUPS.indexOf(group) } as CSSProperties}>
          <span className={`phrase-tab-ink is-${group}`} aria-hidden="true" />
          {GROUPS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={group === key}
              className={`phrase-tab is-${key}`}
              onClick={() => setGroup(key)}
            >
              <span lang="ko">{GROUP_KO[key]}</span>
              {language !== "ko" && <span>{m.groups[key]}</span>}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={m.groups[group]}>
          {group === "emergency" && (
            <div className="phrase-sos">
              <p className="phrase-sos-note">
                <SirenIcon />
                {m.emergencyNote}
              </p>
              <ul>
                {SOS.map(({ number, key }) => (
                  <li key={number}>
                    <a className="phrase-sos-call" href={`tel:${number}`}>
                      <PhoneIcon />
                      <strong>{number}</strong>
                      <span>{safety[key]}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className={`phrase-grid is-${group}`} key={group}>
            {PHRASE_GROUPS[group].map((key, i) => (
              <li key={key} style={{ "--i": i } as CSSProperties}>
                <button
                  type="button"
                  className={speaking === key ? "phrase-card is-speaking" : "phrase-card"}
                  onClick={() => speak(key)}
                  aria-label={`${PHRASE_KO[key]} — ${m.items[key]}`}
                  disabled={!canSpeak}
                >
                  <span className="phrase-ko" lang="ko">
                    {PHRASE_KO[key]}
                  </span>
                  {sounds && <span className="phrase-sound">{sounds[key]}</span>}
                  {m.items[key] !== PHRASE_KO[key] && <span className="phrase-meaning">{m.items[key]}</span>}
                  {canSpeak && (
                    <span className="phrase-play" aria-hidden="true">
                      <SpeakerIcon />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
