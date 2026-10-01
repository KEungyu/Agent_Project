// 시각은 한국 시간(+09:00)을 붙인 ISO 문자열로 저장하고, 표시는 한국 시간 기준으로 한다.

// <input type="datetime-local"> 값("2026-10-20T00:40") → "2026-10-20T00:40+09:00"
export function fromLocalInput(value: string): string | undefined {
  return value ? `${value}+09:00` : undefined;
}

// 저장된 값 → <input type="datetime-local"> 값
export function toLocalInput(value: string | undefined): string {
  return value ? value.slice(0, 16) : "";
}

// 저장된 시각 → 이용자 언어로 "10월 20일 00:40" 형식
export function formatKst(value: string | undefined, locale = "en"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

// "2026-10-22" → 이용자 언어로 "10월 22일 (목)" 형식
export function formatDate(value: string | undefined, locale = "en"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric", weekday: "short" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

// 저장된 시각 → 한국 시간 "HH:MM"
export function formatTimeKst(value: string | undefined, locale = "en"): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(value),
  );
}

// 저장된 시각 → 한국 시간 기준 하루 중 분 (0~1439)
export function kstMinutesOfDay(value: string): number {
  const date = new Date(value);
  return (date.getUTCHours() * 60 + date.getUTCMinutes() + 9 * 60) % (24 * 60);
}

// 저장된 시각 → 한국 시간 기준 날짜 "YYYY-MM-DD"
export function kstDate(value: string): string {
  return new Date(new Date(value).getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}
