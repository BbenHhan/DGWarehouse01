// specs/032-checklist-detail-status-colors (extended by specs/034-pixel-mode-
// refresh) — a per-room, per-theme color lookup. Keyed by slug (not id):
// "mock"/"local" backends use the slug itself as the room's id, while
// "supabase" mode uses a real UUID — slug is the only value stable across
// all three. Classes reference CSS variables (--room-N-bg/-fg/-border,
// defined per theme in app/globals.css) rather than literal Tailwind
// palette classes, so the same nine slots can carry different actual colors
// per theme (identical to today's colors for Light/Dark/Minimal, a new
// mutually-distinct 9-color set for Pixel — specs/034 FR-003/FR-007)
// without any component needing to know which theme is active
// (Constitution VI: Tailwind classes only, no inline styles — arbitrary-
// value classes like `bg-[var(--room-1-bg)]` satisfy that while still
// resolving through the CSS variable layer specs/033 already established).
type RoomColorClasses = {
  chip: string; // room-tag chip (e.g. sitewide checklist page)
  row: string; // a per-room row/box background
  select: string; // that room's own status <select>, bg+text+border
};

const ROOM_COLORS: Record<string, RoomColorClasses> = {
  "hong-raek": {
    chip: "bg-[var(--room-1-bg)] text-[var(--room-1-fg)]",
    row: "bg-[var(--room-1-bg)]",
    select: "bg-[var(--room-1-bg)] text-[var(--room-1-fg)] border-[var(--room-1-border)]",
  },
  "hong-klang": {
    chip: "bg-[var(--room-2-bg)] text-[var(--room-2-fg)]",
    row: "bg-[var(--room-2-bg)]",
    select: "bg-[var(--room-2-bg)] text-[var(--room-2-fg)] border-[var(--room-2-border)]",
  },
  "hong-soi-1": {
    chip: "bg-[var(--room-3-bg)] text-[var(--room-3-fg)]",
    row: "bg-[var(--room-3-bg)]",
    select: "bg-[var(--room-3-bg)] text-[var(--room-3-fg)] border-[var(--room-3-border)]",
  },
  "hong-soi-2": {
    chip: "bg-[var(--room-4-bg)] text-[var(--room-4-fg)]",
    row: "bg-[var(--room-4-bg)]",
    select: "bg-[var(--room-4-bg)] text-[var(--room-4-fg)] border-[var(--room-4-border)]",
  },
  "hong-soi-3": {
    chip: "bg-[var(--room-5-bg)] text-[var(--room-5-fg)]",
    row: "bg-[var(--room-5-bg)]",
    select: "bg-[var(--room-5-bg)] text-[var(--room-5-fg)] border-[var(--room-5-border)]",
  },
  "hong-soi-4": {
    chip: "bg-[var(--room-6-bg)] text-[var(--room-6-fg)]",
    row: "bg-[var(--room-6-bg)]",
    select: "bg-[var(--room-6-bg)] text-[var(--room-6-fg)] border-[var(--room-6-border)]",
  },
};

const FALLBACK_ROOM_COLOR: RoomColorClasses = {
  chip: "bg-secondary text-secondary-foreground",
  row: "bg-secondary/40",
  select: "bg-secondary text-secondary-foreground border-border",
};

export function getRoomColor(slug: string): RoomColorClasses {
  return ROOM_COLORS[slug] ?? FALLBACK_ROOM_COLOR;
}

// A status's color is always fixed/room-independent (spec FR-008) — reserves
// room color for room identity, status color for status, never both on the
// same element. Also theme-scoped (specs/034) the same way room colors are.
export const STATUS_COLORS: Record<"todo" | "in_progress" | "done", { badge: string; select: string }> = {
  todo: {
    badge: "bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)]",
    select: "bg-[var(--status-todo-bg)] text-[var(--status-todo-fg)] border-[var(--status-todo-border)]",
  },
  in_progress: {
    badge: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
    select: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)] border-[var(--status-progress-border)]",
  },
  done: {
    badge: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
    select: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)] border-[var(--status-done-border)]",
  },
};

export const STATUS_LABELS: Record<"todo" | "in_progress" | "done", string> = {
  todo: "ยังไม่เริ่ม",
  in_progress: "กำลังทำ",
  done: "เสร็จแล้ว",
};
