# Research: Pixel Mode Palette & Staircase Corners

## Decision 1: Room/status colors become theme-scoped CSS variables — `lib/room-colors.ts` keeps its shape, just points at variables instead of hardcoded Tailwind palette classes

**Decision**: Nine new CSS custom properties per theme (`--room-1-bg`/`-fg` … `--room-6-bg`/`-fg`, `--status-todo-bg`/`-fg`, `--status-progress-bg`/`-fg`, `--status-done-bg`/`-fg`), defined identically to today's existing hardcoded values for Light/Dark/Minimal, and to the new 9-color palette for Pixel only. `lib/room-colors.ts`'s `getRoomColor`/`STATUS_COLORS` return Tailwind arbitrary-value classes referencing these variables (e.g. `bg-[var(--room-1-bg)] text-[var(--room-1-fg)]`) instead of literal palette classes (e.g. `bg-sky-100 text-sky-700`).

**Rationale**: specs/031/032's room/status colors were theme-agnostic (same six/three colors regardless of Light/Dark/Minimal/Pixel) — the account holder's ask is Pixel-only. Routing through CSS variables means the theme switch (specs/033) keeps working exactly the same way it already does for every other color in the app: no React state, no per-component theme-reading logic, just a different variable value depending on `[data-theme]`. Each arbitrary-value class string must stay a complete literal in the source (not template-interpolated) for Tailwind's build-time class scanner to pick it up — `lib/room-colors.ts`'s lookup object already has one literal entry per room/status, so this is a value swap inside existing entries, not a structural change.

## Decision 2: Staircase corners via `clip-path`, layered onto the same broad selectors specs/033 already used for Pixel's border/shadow rule

**Decision**: `[data-theme="pixel"] .rounded-xl, [data-theme="pixel"] .rounded-2xl` gets an added `clip-path: polygon(...)` (an 8px stepped-corner cut) alongside its existing `border-width`/`box-shadow` from specs/033; `[data-theme="pixel"] .rounded-full` gets the same treatment at a 4px step (badges/pills), which visually turns a pill into a small staircase-cornered chip.

**Rationale**: A `clip-path` polygon stepping in by N pixels at each corner is the standard, dependency-free CSS technique for a genuine "pixel-art corner" — no image assets, no per-component markup change, consistent with specs/033 Decision 1's whole approach of reskinning through shared selectors. Modern browsers already apply `box-shadow` following the clipped shape, so the existing offset-shadow from specs/033 continues to look correct (a stepped shadow, not a shadow poking out past the staircase notch) without extra work.

## Decision 3: The room checklist box's "always yellow in Pixel mode" is a small, additive CSS override on a new stable class — not a behavior change for the other three modes

**Decision**: `RoomChecklistBox`'s outer container keeps its existing room-tinted background class (`colors.row`, unchanged for Light/Dark/Minimal) but also gets one new stable class, `checklist-box`. `[data-theme="pixel"] .checklist-box { background-color: var(--pixel-box-bg); }` overrides the room-tint specifically in Pixel mode via normal CSS cascade (a more specific compound selector against the same property), leaving every inner per-room row/chip's own coloring untouched.

**Rationale**: The account holder's ask ("กล่อง checklist อันใหญ่ขอสีเหลือง") was specifically about Pixel mode's big box reading as "the yellow box," not a request to change what the box's background means in any other mode (where it's still meaningfully room-tinted, matching specs/031's design). One small, additive className on the component is a much smaller and safer change than reworking the box's background logic conditionally in JS/TSX.

## Decision 4: The pixel font (Press Start 2P) stays out of this feature's implementation scope

**Decision**: Despite the earlier live font test, this feature does not wire Press Start 2P into any real component. Only the corners, the 9-color palette, and the yellow background/box — the three things repeated and refined across multiple explicit rounds — are implemented.

**Rationale**: The account holder's font test message ended with "โอเคละ" (approving that specific mockup's overall look) but the very next messages moved directly to color/corner refinement without asking for the pixel font to be wired into the real app, and the account holder explicitly acknowledged the Thai-coverage limitation without objecting to leaving it out. Implementing a font that can only ever affect a handful of English/numeric characters app-wide, with no explicit follow-up request to actually apply it, isn't part of what was asked to be built now — it can be added later as its own small change if requested.
