# Tasks: A Readable Room Checklist

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-04

---

## Phase 1: User Story 1 — Telling one entry from the next (P1) 🎯

- [X] T001 Enclose each entry in `components/RoomChecklistBox.tsx` in its own card, matching the pattern the sitewide checklist already uses (FR-001, FR-004)
- [X] T002 Put each sub-item in a box of its own, nested inside its parent's card and separated from the entry's own row by a divider, so belonging is shown by containment rather than by indentation (FR-002)
- [X] T003 Widen the gap between entries and drop the indent-only nesting, so the space between two entries is clearly greater than the space inside one (FR-003)
- [X] T004 Move the add-a-sub field inside its entry's card and mark it as secondary rather than tinting it like a row (FR-006, partly — see Phase 3)
- [X] T005 Verify the result visually at 375 px against the room's own tint, using the app's real stylesheet (FR-008, FR-009, SC-005)
- [X] T006 Run `npx vitest run`, `npx tsc --noEmit`, `npm run lint`

---

## Phase 2: Verification

- [ ] T007 **[needs a signed-in editor]** Open a room page and confirm, at a glance, which sub-item belongs to which entry (SC-001)

---

## Phase 3: Open — the account holder's decisions, not mine

These two came out of the same report and are specified, but they change what is on screen
rather than how it is arranged, so they are not being done on my own judgement. Both were
put as questions and are unanswered.

- [ ] T008 FR-005 — the room's name currently repeats on every row, parent and sub. It went in at the account holder's request in feature 042 and is half of the reported density. Options: name the room once in the box heading, or leave it on every row
- [ ] T009 FR-006 — the add-a-sub field stands open under every entry, so four entries mean four input fields. Options: collapse it behind a small "+" on each entry, or leave it open

---

## Notes

The visual check in T005 was done by serving the component's exact markup against the app's
compiled stylesheet on a scratch server, since signing in has not been possible in this
session. That is weaker than seeing the running page, and T007 exists because of it.
