import { expect, it } from "vitest";
import { compareKoreaTime } from "./time";

it("동일 순간의 날짜 경계·DST·분 단위 시차를 비교하고 잘못된 입력을 거부한다", () => {
  const winter = compareKoreaTime("2026-01-01T01:00", "America/New_York")!;
  expect(winter.offset).toBe("−14:00");
  expect(winter.home).toContain("2025"); // 한국 1/1, 뉴욕 12/31
  expect(compareKoreaTime("2026-07-01T01:00", "America/New_York")!.offset).toBe("−13:00");
  expect(compareKoreaTime("2026-03-08T15:59", "America/New_York")!.offset).toBe("−14:00");
  expect(compareKoreaTime("2026-03-08T16:00", "America/New_York")!.offset).toBe("−13:00");
  expect(compareKoreaTime("2026-10-07T12:00", "Asia/Kathmandu")!.offset).toBe("−03:15");
  expect(compareKoreaTime("2026-10-07T12:00", "Asia/Jakarta")!.offset).toBe("−02:00");
  expect(compareKoreaTime("2026-10-07T12:00", "Asia/Jayapura")!.offset).toBe("+00:00");
  expect(compareKoreaTime("2026-10-07T23:30", "Pacific/Auckland")!.offset).toBe("+04:00");
  for (const [input, zone] of [["2026-02-30T12:00", "UTC"], ["2026-10-07T24:00", "UTC"], ["", "UTC"], ["2026-10-07T12:00", "Bad/Zone"]])
    expect(compareKoreaTime(input, zone)).toBeNull();
  expect(compareKoreaTime("2026-10-07T12:00", "Asia/Seoul", "th")!.korea).toContain("2026");
});
