import { describe, expect, it } from "vitest";
import { CURRENCY_BY_LANGUAGE, formatMoney } from "./rates";

describe("currency", () => {
  it("picks a currency for every language except Korean", () => {
    expect(Object.keys(CURRENCY_BY_LANGUAGE)).toHaveLength(8);
    expect(CURRENCY_BY_LANGUAGE.ja).toBe("JPY");
  });

  it("formats each currency the local way, without decimals for large amounts", () => {
    expect(formatMoney(1650.4, "JPY", "ja")).toBe("￥1,650");
    expect(formatMoney(11.13, "USD", "en")).toBe("$11.13");
    expect(formatMoney(559_667, "VND", "vi")).toMatch(/560\.000/);
  });
});
