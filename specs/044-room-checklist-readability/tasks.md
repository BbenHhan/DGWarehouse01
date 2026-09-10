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

- [ ] T007 **[a person is needed: a judgement about how it looks]** Open a room page and confirm, at a glance, which sub-item belongs to which entry (SC-001). That the nesting exists is asserted in `components/RoomChecklistBox.test.tsx`; whether the spacing and borders actually make it readable is a judgement, not an assertion

---

## Phase 3: Decided and done

These two change what is on screen rather than how it is arranged, so they were put to the
account holder as questions rather than settled by me. The answer was to handle them, so
each records the choice made and why — both are one-line reversals if either is wrong.

- [X] T008 FR-005 — the room's name currently repeats on every row, parent and sub. It went in at the account holder's request in feature 042 and is half of the reported density. **Named once, in the box heading** (`เช็คลิสต์ห้องกลาง`). What the original requirement was for — a row never leaning on the page heading to say which room it concerns — is served by the heading itself, since every row in this box is that one room
- [X] T009 FR-006 — the add-a-sub field stands open under every entry, so four entries mean four input fields. **Collapsed behind a quiet "＋ เพิ่มรายการย่อย" on each entry**, which opens the field and focuses it in one gesture, and closes again on blur if nothing was typed

---

## Notes

The visual check in T005 was done by serving the component's exact markup against the app's
compiled stylesheet on a scratch server, since signing in has not been possible in this
session. That is weaker than seeing the running page, and T007 exists because of it.
