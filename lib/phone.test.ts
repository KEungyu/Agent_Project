import { describe, expect, it } from "vitest";
import { koreanPhone } from "./phone";

describe("koreanPhone", () => {
  it("서울·휴대전화·지역 번호를 국제 표기로 바꾼다", () => {
    expect(koreanPhone("02-000-0000")).toEqual({ local: "02-000-0000", international: "+82 2-000-0000", tel: "+8220000000" });
    expect(koreanPhone("010-1234-5678")).toMatchObject({ international: "+82 10-1234-5678", tel: "+821012345678" });
    expect(koreanPhone("+82 51 123 4567")).toMatchObject({ local: "051-123-4567", international: "+82 51-123-4567" });
  });
  it("모르는 형식은 바꾸지 않는다", () => {
    expect(koreanPhone("1330")).toBeNull();
    expect(koreanPhone("+1 415 555 0100")).toBeNull();
  });
});
