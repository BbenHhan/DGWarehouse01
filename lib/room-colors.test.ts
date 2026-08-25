import { describe, expect, it } from "vitest";
import { STATUS_COLORS, STATUS_LABELS, getRoomColor } from "@/lib/room-colors";

// specs/032-checklist-detail-status-colors + specs/034-pixel-mode-refresh.
// The whole point of this lookup is that colors resolve through per-theme CSS
// variables rather than literal palette classes, so a theme swap never needs a
// component change — these assert that indirection is actually there, and that
// the six real rooms each land on their own distinct slot.
const REAL_ROOM_SLUGS = ["hong-raek", "hong-klang", "hong-soi-1", "hong-soi-2", "hong-soi-3", "hong-soi-4"];

describe("getRoomColor", () => {
  it.each(REAL_ROOM_SLUGS)("gives %s a chip, row, and select class set", (slug) => {
    const color = getRoomColor(slug);
    expect(color.chip).toBeTruthy();
    expect(color.row).toBeTruthy();
    expect(color.select).toBeTruthy();
  });

  it("gives each of the six rooms a distinct color slot", () => {
    const slots = REAL_ROOM_SLUGS.map((slug) => getRoomColor(slug).chip);
    expect(new Set(slots).size).toBe(REAL_ROOM_SLUGS.length);
  });

  it("routes room colors through CSS variables, never literal palette classes", () => {
    for (const slug of REAL_ROOM_SLUGS) {
      expect(getRoomColor(slug).chip).toContain("var(--room-");
    }
  });

  it("falls back to neutral secondary classes for an unknown slug", () => {
    const fallback = getRoomColor("not-a-real-room");
    expect(fallback.chip).toBe("bg-secondary text-secondary-foreground");
    expect(fallback.chip).not.toContain("var(--room-");
  });

  it("falls back rather than throwing when given a uuid instead of a slug", () => {
    // Supabase mode keys rooms by uuid; the lookup is slug-keyed on purpose,
    // so callers must pass the slug — a uuid must degrade, not crash.
    expect(() => getRoomColor("3f2504e0-4f89-11d3-9a0c-0305e82c3301")).not.toThrow();
  });
});

describe("STATUS_COLORS", () => {
  it.each(["todo", "in_progress", "done"] as const)("gives %s a badge and select class", (status) => {
    expect(STATUS_COLORS[status].badge).toBeTruthy();
    expect(STATUS_COLORS[status].select).toBeTruthy();
  });

  it("gives each status its own distinct color", () => {
    const badges = [STATUS_COLORS.todo.badge, STATUS_COLORS.in_progress.badge, STATUS_COLORS.done.badge];
    expect(new Set(badges).size).toBe(3);
  });

  it("routes status colors through CSS variables too", () => {
    expect(STATUS_COLORS.in_progress.badge).toContain("var(--status-");
    expect(STATUS_COLORS.done.badge).toContain("var(--status-");
  });
});

describe("STATUS_LABELS", () => {
  it("labels all three states in Thai", () => {
    expect(STATUS_LABELS.todo).toBe("ยังไม่เริ่ม");
    expect(STATUS_LABELS.in_progress).toBe("กำลังทำ");
    expect(STATUS_LABELS.done).toBe("เสร็จแล้ว");
  });
});
