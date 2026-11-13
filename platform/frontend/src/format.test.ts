import { describe, it, expect } from "vitest";
import { fmtInt, fmtMoney, fmtMoneyShort, fmtPct } from "./format";

describe("fmtMoney — exact decimal strings, never float-rounded", () => {
  it("groups thousands and trims trailing zeros", () => {
    expect(fmtMoney("1250000.0000", "en")).toBe("EGP 1,250,000");
    expect(fmtMoney("450054.0000", "en", false)).toBe("450,054");
  });
  it("preserves significant fraction digits exactly", () => {
    expect(fmtMoney("100.10", "en", false)).toBe("100.1");
    expect(fmtMoney("0.0001", "en", false)).toBe("0.0001");
    // a value binary floats cannot represent exactly must survive intact
    expect(fmtMoney("9007199254740993.00", "en", false)).toBe("9,007,199,254,740,993");
  });
  it("handles null and negative values", () => {
    expect(fmtMoney(null, "en")).toBe("—");
    expect(fmtMoney("-1250.50", "en", false)).toBe("-1,250.5");
  });
  it("renders Arabic-Indic digits and the Arabic currency suffix", () => {
    const ar = fmtMoney("1250000.0000", "ar");
    expect(ar).toContain("ج.م");
    expect(ar).toContain("١");
    expect(ar).not.toContain("1,250,000");
  });
});

describe("fmtMoneyShort", () => {
  it("compacts billions and millions in English", () => {
    expect(fmtMoneyShort("7270000000.0000", "en")).toBe("EGP 7.27B");
    expect(fmtMoneyShort("356445.0000", "en")).toBe("EGP 356.45K");
  });
  it("compacts in Arabic with Arabic unit words", () => {
    expect(fmtMoneyShort("7270000000.0000", "ar")).toContain("مليار");
  });
  it("falls back to full formatting below one thousand", () => {
    expect(fmtMoneyShort("950.0000", "en")).toBe("EGP 950");
  });
});

describe("fmtInt / fmtPct", () => {
  it("localizes integer digits", () => {
    expect(fmtInt(1234567, "en")).toBe("1,234,567");
    expect(fmtInt(27, "ar")).toBe("٢٧");
  });
  it("formats percentages per locale and guards zero denominators", () => {
    expect(fmtPct(1, 4, "en")).toBe("25%");
    expect(fmtPct(50, 100, "ar")).toBe("٥٠٪");
    expect(fmtPct(3, 0, "en")).toBe("—");
  });
});
