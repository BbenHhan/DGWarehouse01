import { describe, expect, it } from "vitest";
import { rangesOverlap } from "@/lib/date-range";

describe("rangesOverlap", () => {
  it("returns false for non-overlapping ranges", () => {
    expect(rangesOverlap("2026-06-01", "2026-06-07", "2026-06-10", "2026-06-15")).toBe(false);
    expect(rangesOverlap("2026-06-10", "2026-06-15", "2026-06-01", "2026-06-07")).toBe(false);
  });

  it("returns true for fully-overlapping ranges", () => {
    expect(rangesOverlap("2026-06-01", "2026-06-30", "2026-06-08", "2026-06-15")).toBe(true);
  });

  it("returns true for partial overlap on the right side", () => {
    expect(rangesOverlap("2026-06-08", "2026-06-15", "2026-06-12", "2026-06-20")).toBe(true);
  });

  it("returns true for partial overlap on the left side", () => {
    expect(rangesOverlap("2026-06-12", "2026-06-20", "2026-06-08", "2026-06-15")).toBe(true);
  });

  it("returns true for identical ranges", () => {
    expect(rangesOverlap("2026-06-08", "2026-06-15", "2026-06-08", "2026-06-15")).toBe(true);
  });

  it("returns true for adjacent ranges sharing a boundary day (inclusive)", () => {
    // The overlap check is inclusive of endpoints — a week ending 06-15 and
    // one starting 06-15 do count as overlapping (same calendar day).
    expect(rangesOverlap("2026-06-08", "2026-06-15", "2026-06-15", "2026-06-22")).toBe(true);
  });

  it("returns false for ranges separated by at least one full day", () => {
    expect(rangesOverlap("2026-06-08", "2026-06-15", "2026-06-16", "2026-06-22")).toBe(false);
  });
});
