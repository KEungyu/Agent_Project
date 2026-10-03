import type { Messages } from "../i18n/messages";
import { formatFullDate, formatFullKst } from "../time";

// 승인 전에 이용자가 확인할 핵심 사실(체크인 날짜·숙소 도착·체크아웃)을 이용자 언어로 만든다.
// 초안을 쓴 바로 그 값(요청에 저장된 slots)에서 만들어, 한국어 원문·번역·요약이 같은 사실을 가리키게 한다.
export type Fact = { label: string; value: string };

export function requestFacts(slots: Record<string, string>, language: string, m: Messages["approval"]): Fact[] {
  const facts: Fact[] = [];
  if (slots.check_in_date) facts.push({ label: m.factCheckIn, value: formatFullDate(slots.check_in_date, language) });
  if (slots.expected_arrival) facts.push({ label: m.factArrival, value: formatFullKst(slots.expected_arrival, language) });
  if (slots.check_out_date) facts.push({ label: m.factCheckOut, value: formatFullDate(slots.check_out_date, language) });
  return facts;
}
