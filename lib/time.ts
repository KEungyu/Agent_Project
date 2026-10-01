// 시각은 한국 시간(+09:00)을 붙인 ISO 문자열로 저장한다.

// <input type="datetime-local"> 값("2026-10-20T00:40") → "2026-10-20T00:40+09:00"
export function fromLocalInput(value: string): string | undefined {
  return value ? `${value}+09:00` : undefined;
}

// 저장된 값 → <input type="datetime-local"> 값
export function toLocalInput(value: string | undefined): string {
  return value ? value.slice(0, 16) : "";
}

// 저장된 값 → 화면 표시 ("Oct 20, 00:40")
export function formatKst(value: string | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
