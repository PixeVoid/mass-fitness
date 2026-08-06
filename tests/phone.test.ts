import { describe, expect, it } from "vitest";
import { normalisePhone } from "@/lib/phone";

/**
 * One person must not become two accounts because they typed their number
 * differently — the reason this exists at all.
 */
describe("normalisePhone", () => {
  it("treats every spelling of one Indian number as the same number", () => {
    const spellings = [
      "9876543210",
      "+919876543210",
      "09876543210",
      "98765 43210",
      "+91 98765 43210",
      "  9876543210  ",
      "+91-98765-43210",
    ];
    const results = spellings.map((s) => {
      const r = normalisePhone(s);
      expect(r.ok, `${s} should parse`).toBe(true);
      return r.ok ? r.phone : null;
    });
    expect(new Set(results).size).toBe(1);
  });

  it("rejects an empty value", () => {
    expect(normalisePhone("   ").ok).toBe(false);
  });

  it("rejects a number that is too short", () => {
    expect(normalisePhone("98765").ok).toBe(false);
  });

  it("rejects an Indian number not starting 6-9", () => {
    expect(normalisePhone("1234567890").ok).toBe(false);
    expect(normalisePhone("5876543210").ok).toBe(false);
  });

  it("accepts each valid Indian leading digit", () => {
    for (const lead of ["6", "7", "8", "9"]) {
      expect(normalisePhone(`${lead}876543210`).ok, lead).toBe(true);
    }
  });

  it("leaves an explicit foreign country code alone", () => {
    const r = normalisePhone("+442071838750");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.phone).toContain("44");
  });
});
