import { describe, expect, it } from "vitest";
import { photoMatchesDateFilter } from "@/lib/date-filter";

describe("photoMatchesDateFilter", () => {
  it("matches everything when both from and to are unset", () => {
    expect(photoMatchesDateFilter("2026-06-10", {})).toBe(true);
    expect(photoMatchesDateFilter("2020-01-01", {})).toBe(true);
  });

  it("matches dates on/after from when only from is set", () => {
    expect(photoMatchesDateFilter("2026-06-10", { from: "2026-06-10" })).toBe(true);
    expect(photoMatchesDateFilter("2026-06-11", { from: "2026-06-10" })).toBe(true);
    expect(photoMatchesDateFilter("2026-06-09", { from: "2026-06-10" })).toBe(false);
  });

  it("matches dates on/before to when only to is set", () => {
    expect(photoMatchesDateFilter("2026-06-10", { to: "2026-06-10" })).toBe(true);
    expect(photoMatchesDateFilter("2026-06-09", { to: "2026-06-10" })).toBe(true);
    expect(photoMatchesDateFilter("2026-06-11", { to: "2026-06-10" })).toBe(false);
  });

  it("matches dates within an inclusive valid range", () => {
    const filter = { from: "2026-06-08", to: "2026-06-15" };
    expect(photoMatchesDateFilter("2026-06-08", filter)).toBe(true);
    expect(photoMatchesDateFilter("2026-06-15", filter)).toBe(true);
    expect(photoMatchesDateFilter("2026-06-11", filter)).toBe(true);
    expect(photoMatchesDateFilter("2026-06-07", filter)).toBe(false);
    expect(photoMatchesDateFilter("2026-06-16", filter)).toBe(false);
  });

  it("treats an invalid/reversed range (from after to) as unfiltered", () => {
    const filter = { from: "2026-06-15", to: "2026-06-08" };
    expect(photoMatchesDateFilter("2026-01-01", filter)).toBe(true);
    expect(photoMatchesDateFilter("2026-12-31", filter)).toBe(true);
  });
});
