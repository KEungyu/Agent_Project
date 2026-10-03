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

// 연도는 한국어 원문과 같도록 어느 언어에서나 서력으로 쓴다 (태국어 기본값은 불기 2569년)
const gregorian = (locale: string) => `${locale}-u-ca-gregory`;

// 승인 전에 확인하는 날짜: 연도·요일까지 ("2026-10-09" → "Fri, Oct 9, 2026")
export function formatFullDate(value: string, locale = "en"): string {
  return new Intl.DateTimeFormat(gregorian(locale), { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}

// 승인 전에 확인하는 시각: 연도·요일·24시간·KST까지 ("2026-10-10T01:00+09:00" → "Sat, Oct 10, 2026, 01:00 KST")
export function formatFullKst(value: string, locale = "en"): string {
  const text = new Intl.DateTimeFormat(gregorian(locale), {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return `${text} KST`;
}
