"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

// 복사 버튼: 누르면 아이콘이 체크로 바뀌며 톡 튀고, 물결이 퍼진다. 잠시 뒤 원래대로 돌아온다.
export function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드 권한이 없으면 숨은 입력칸으로 복사한다
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1800);
  };

  return (
    <button type="button" className={done ? "copy-button is-done" : "copy-button"} onClick={copy} aria-live="polite">
      <span className="copy-icon" key={done ? "done" : "idle"}>
        {done ? <CheckIcon /> : <CopyIcon />}
      </span>
      {done ? copied : label}
    </button>
  );
}
