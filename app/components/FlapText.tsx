"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// 넘김판 글자: 글자가 실제로 바뀔 때만(그리고 언어를 바꿀 때만) 글자마다 위에서 아래로 넘어간다.
// 처음 그릴 때는 움직이지 않는다. 한·중·일·태국 문자도 글자 단위(grapheme)로 나누고, 단어 중간에서 줄바꿈되지 않게 묶는다.
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const graphemes = (text: string) => (segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text));

export function FlapText({ text, lang, className }: { text: string; lang?: string; className?: string }) {
  const previous = useRef<string | null>(null);
  const changing = previous.current !== null && previous.current !== text;
  useEffect(() => {
    previous.current = text;
  }, [text]);

  let index = 0;
  return (
    <span key={text} className={`flap ${changing ? "is-changing" : ""} ${className ?? ""}`} lang={lang} aria-label={text}>
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden="true">
          {w > 0 && " "}
          <span className="flap-word">
            {graphemes(word).map((char, i) => (
              <span key={i} className="flap-char" style={{ "--i": Math.min(index++, 40) } as CSSProperties}>
                {char}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
