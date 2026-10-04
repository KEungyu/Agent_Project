import { describe, expect, it } from "vitest";
import { overlapsWithOthers, stayOverlap } from "./overlap";
import type { Stay } from "./types";

const stay = (id: string, name: string, check_in_date: string, check_out_date: string) =>
  ({ id, board_id: "b", name, check_in_date, check_out_date, field_sources: {} }) as Stay;

describe("숙소 날짜 겹침 (B07)", () => {
  it("체크아웃 날 다른 숙소로 옮기는 것은 겹침이 아니다", () => {
    expect(stayOverlap(stay("1", "A", "2026-10-09", "2026-10-11"), stay("2", "B", "2026-10-11", "2026-10-13"))).toBeNull();
  });

  it("하루라도 같이 묵으면 겹치는 구간을 돌려준다", () => {
    expect(stayOverlap(stay("1", "A", "2026-10-09", "2026-10-12"), stay("2", "B", "2026-10-11", "2026-10-13"))).toEqual({
      a: "A",
      b: "B",
      from: "2026-10-11",
      to: "2026-10-12",
    });
  });

  it("날짜가 비었거나 거꾸로면 판단하지 않고, 자기 자신은 빼고 본다", () => {
    const stays = [stay("1", "A", "2026-10-09", "2026-10-12")];
    expect(overlapsWithOthers({ id: "1", name: "A", check_in_date: "2026-10-10", check_out_date: "2026-10-11" }, stays)).toEqual([]);
    expect(overlapsWithOthers({ name: "B", check_in_date: "2026-10-12", check_out_date: "2026-10-10" }, stays)).toEqual([]);
    expect(overlapsWithOthers({ name: "B", check_in_date: "2026-10-10" }, stays)).toEqual([]);
  });
});
