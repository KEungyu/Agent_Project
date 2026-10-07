// 외부 예약 사이트 연결. 검증한 공급자와 정확한 호스트만 허용한다.
// URL은 파싱한 프로토콜(https)과 실제 hostname으로 확인한다: booking.com.evil.example 같은 유사 도메인,
// javascript: 주소, 아이디·비밀번호가 붙은 주소는 거부한다.

export type ExternalProvider = "booking" | "catchtable";

export const EXTERNAL_PROVIDERS: Record<
  ExternalProvider,
  { name: string; hosts: string[]; home: string; verifiedAt: string; note: string }
> = {
  // 2026-10-04 공식 웹 첫 화면 열림 확인. 날짜·인원 자동 입력용 URL 매개변수는 지원 여부를 확인하지 않아 쓰지 않는다
  booking: {
    name: "Booking.com",
    hosts: ["www.booking.com"],
    home: "https://www.booking.com/",
    verifiedAt: "2026-10-04",
    note: "official web home; no unverified search parameters",
  },
  // 2026-10-04 Global 첫 화면이 영어(lang=en, ENG 표시, Waitlist 메뉴)로 열리는 것 확인. ?lang= 같은 매개변수는 붙이지 않는다
  catchtable: {
    name: "CatchTable Global (English)",
    hosts: ["www.catchtable.net"],
    home: "https://www.catchtable.net/",
    verifiedAt: "2026-10-04",
    note: "English global web home; restaurant pages only when verified",
  },
};

export function safeExternalUrl(raw: string, provider: ExternalProvider): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!EXTERNAL_PROVIDERS[provider].hosts.includes(url.hostname.toLowerCase())) return null;
  return url.href;
}

// 채팅에 붙는 외부 연결 행동. 연결은 예약이 아니다: status는 언제나 "site_link"(외부 예약 화면 연결)다
export type ExternalAction = {
  kind: "external_link";
  id: string; // 같은 응답을 다시 그려도 한 번만 열도록 쓰는 값 (도구 호출 id)
  provider: ExternalProvider;
  url: string;
  autoOpen: boolean;
  status: "site_link";
  summary: { label: string; value: string }[]; // 사이트에서 직접 입력할 조건 (복사용)
  mode?: "site" | "api"; // Booking.com: 공식 API 결과면 api, 아니면 site
};

export function isExternalAction(value: unknown): value is ExternalAction {
  const action = value as ExternalAction | null;
  return (
    !!action &&
    action.kind === "external_link" &&
    typeof action.id === "string" && action.id.length > 0 &&
    action.status === "site_link" && typeof action.autoOpen === "boolean" &&
    Array.isArray(action.summary) && action.summary.length <= 8 &&
    action.summary.every((row) => row && typeof row.label === "string" && typeof row.value === "string") &&
    (action.provider === "booking" || action.provider === "catchtable") &&
    typeof action.url === "string" &&
    safeExternalUrl(action.url, action.provider) !== null
  );
}

// 화면 언어가 바뀌어도 카드를 만들 때의 언어로 조건을 확인한다.
export function hasExternalBookingDetails(action: Pick<ExternalAction, "provider" | "summary">): boolean {
  return LANGUAGES.some(({ code }) => {
    const m = getMessages(code).actions;
    const labels = action.provider === "catchtable" ? [m.restaurant, m.branch, m.date, m.time, m.party] : [m.destination, m.checkIn, m.checkOut, m.guests, m.rooms];
    return labels.every((label) => action.summary.some((row) => row.label === label && row.value.trim()));
  });
}
import { LANGUAGES } from "../i18n/languages";
import { getMessages } from "../i18n/messages";
