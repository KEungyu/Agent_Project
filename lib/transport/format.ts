import { fmt, type Messages } from "../i18n/messages";

// 소요 시간을 이용자 언어로 "약 2시간 10분"처럼 적는다
export function formatDuration(minutes: number, t: Messages["transport"]): string {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  const time = h && min ? fmt(t.hm, { h, m: min }) : h ? fmt(t.h, { h }) : fmt(t.min, { m: min });
  return fmt(t.about, { time });
}
