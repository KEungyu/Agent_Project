import type { Stay, StayFields } from "./types";

// 숙소 날짜 겹침 (B07). 체크아웃 날은 묵지 않으므로 [체크인, 체크아웃) 구간으로 본다:
// 10-09~10-11 숙소와 10-11~10-13 숙소는 겹치지 않는다(같은 날 옮기기).
// 겹친다고 막지는 않는다. 저장 전에 이용자에게 확인을 받거나(에이전트) 보드에 경고를 띄운다(화면).

type Dated = Pick<StayFields, "name" | "check_in_date" | "check_out_date"> & { id?: string };

export type StayOverlap = { a: string; b: string; from: string; to: string }; // 숙소 이름 2개와 겹치는 [from, to)

function range(stay: Dated): [string, string] | null {
  const { check_in_date: start, check_out_date: end } = stay;
  if (!start || !end || end <= start) return null;
  return [start, end];
}

export function stayOverlap(a: Dated, b: Dated): StayOverlap | null {
  const ra = range(a);
  const rb = range(b);
  if (!ra || !rb) return null;
  const from = ra[0] > rb[0] ? ra[0] : rb[0];
  const to = ra[1] < rb[1] ? ra[1] : rb[1];
  return from < to ? { a: a.name, b: b.name, from, to } : null;
}

// 보드의 숙소끼리 겹치는 쌍
export function overlappingStays(stays: Stay[]): StayOverlap[] {
  const found: StayOverlap[] = [];
  for (let i = 0; i < stays.length; i++) {
    for (let j = i + 1; j < stays.length; j++) {
      const overlap = stayOverlap(stays[i], stays[j]);
      if (overlap) found.push(overlap);
    }
  }
  return found;
}

// 바뀐 숙소(또는 새 숙소)가 다른 숙소와 겹치는지. id가 같은 숙소는 자기 자신이라 뺀다
export function overlapsWithOthers(candidate: Dated, stays: Stay[]): StayOverlap[] {
  return stays
    .filter((stay) => stay.id !== candidate.id)
    .map((stay) => stayOverlap(candidate, stay))
    .filter((overlap): overlap is StayOverlap => !!overlap);
}
