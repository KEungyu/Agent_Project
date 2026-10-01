import { describe, expect, it } from "vitest";
import { APP_NAME } from "./app";

describe("app", () => {
  it("앱 이름은 마중이다", () => {
    expect(APP_NAME).toBe("마중");
  });
});
