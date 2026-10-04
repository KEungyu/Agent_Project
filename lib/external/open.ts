import { safeExternalUrl, type ExternalAction } from "./links";

// 외부 예약 화면을 새 탭으로 여는 규칙 (브라우저에서만 부른다).
// 응답 하나에 한 번만 연다. 같은 응답을 다시 그리거나 새로고침해도 다시 열지 않는다.
// 새 탭은 about:blank로 먼저 열고 opener를 끊은 뒤 검증한 주소로 보낸다(새 탭이 이 페이지에 접근하지 못하게).
// 돌려주는 값: true 열림 · false 브라우저가 막음 · undefined 시도 안 함

const OPENED_KEY = "majungi-opened-actions";
// 결과(열림·막힘)도 남긴다: 답이 오면 채팅이 다시 그려지므로(서버 기록으로 새로 마운트) 화면 상태만으로는 사라진다
const RESULT_KEY = "majungi-opened-results";

export function openedResults(): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem(RESULT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveResult(id: string, opened: boolean) {
  try {
    const entries = Object.entries({ ...openedResults(), [id]: opened }).slice(-50);
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 보인다
  }
}

function openedIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(OPENED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function openExternalOnce(action: ExternalAction): boolean | undefined {
  const url = safeExternalUrl(action.url, action.provider);
  if (!url || !action.autoOpen) return undefined;
  const opened = openedIds();
  if (opened.includes(action.id)) return undefined;
  try {
    sessionStorage.setItem(OPENED_KEY, JSON.stringify([...opened, action.id].slice(-50)));
  } catch {
    // 저장소를 못 쓰면 이번 한 번만 시도한다
  }
  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    saveResult(action.id, false);
    return false; // 팝업 차단: 성공이라고 말하지 않고 버튼을 보여준다
  }
  tab.opener = null;
  tab.location.href = url;
  saveResult(action.id, true);
  return true;
}
