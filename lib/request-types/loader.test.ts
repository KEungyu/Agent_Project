import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadRequestTypes } from "./loader";

const INVALID_DIR = path.join(process.cwd(), "tests", "fixtures", "request-types", "invalid");

describe("loadRequestTypes", () => {
  it("data/request-types의 late_checkin이 검증을 통과한다", () => {
    const { types, errors } = loadRequestTypes();
    expect(errors).toEqual([]);
    expect(types.map((type) => type.id)).toEqual(["late_checkin"]);
  });

  it("required_slots가 빠진 파일은 파일과 필드를 알려주며 실패한다", () => {
    const { types, errors } = loadRequestTypes(INVALID_DIR);
    expect(types).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].file).toMatch(/missing_slots\.yaml$/);
    expect(errors[0].issues.some((issue) => issue.startsWith("required_slots:"))).toBe(true);
  });
});
