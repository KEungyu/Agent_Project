"use client";

import { useEffect, useState } from "react";

// 하단 알림. 다른 컴포넌트가 showToast()로 띄운다 (예: 발송 완료).
const EVENT = "majung:toast";

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function Toaster() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (event: Event) => {
      setToast({ id: Date.now(), message: (event as CustomEvent<string>).detail });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toast && (
        <p key={toast.id} className="toast">
          <span className="toast-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {toast.message}
        </p>
      )}
    </div>
  );
}
