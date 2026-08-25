---

description: "Task list for Document Group Field & Pixel-Mode Control Polish"

---

# Tasks: Document Group Field & Pixel-Mode Control Polish

**Input**: Design documents from `/specs/035-select-dropdown-polish/`

**Tests**: No new Vitest coverage — see plan.md Testing.

---

## Phase 1: User Story 1 - The document group field looks and feels like the rest of the app (Priority: P1) 🎯 MVP

- [X] T001 [US1] Create `components/ui/autocomplete.tsx`: `Autocomplete`/`AutocompleteInputGroup`/`AutocompleteInput`/`AutocompletePopup`/`AutocompleteItem`, styled to match `components/ui/select.tsx`'s conventions exactly
- [X] T002 [US1] Update `components/DocUploader.tsx`: replace the `<Input list="doc-upload-note-suggestions">`/`<datalist>` pair with the new `Autocomplete` (items = `existingNotes`), keeping the same controlled `note`/`setNote` state and free-text-accepted behavior

**Checkpoint**: The group field's suggestions are fully custom-styled; typing an unlisted value still works.

- [X] T002b [US1] Fast-follow fix (found live: "dropdown หายไปไหน" — the field had no visible affordance that suggestions existed until the user typed something, unlike the native `<datalist>`'s built-in arrow it replaced): add `AutocompleteTrigger` (a chevron button, styled like `Select`'s own trigger icon) to `components/ui/autocomplete.tsx`, wire `openOnInputClick` on the `Autocomplete` root in `DocUploader.tsx`, and add right-padding on the input so text doesn't run under the button

---

## Phase 2: User Story 2 - Every form control matches Pixel mode's look (Priority: P2)

- [X] T003 [US2] In `app/globals.css`, add `[data-theme="pixel"] .rounded-lg` to the existing staircase-corner/chunky-border rule (a smaller step size than `.rounded-xl`, e.g. 6px)

**Checkpoint**: Selects/inputs in Pixel mode show staircase corners matching nearby cards.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [X] T004 [P] Run `npx tsc --noEmit` — 0 errors
- [X] T005 [P] Run `npx next lint` — no warnings or errors (fixed one unused-import warning along the way: `Input` in `DocUploader.tsx` was no longer used after the swap)
- [X] T006 [P] Run `npm test` — 7 files, 42 tests, all passed

---

## Dependencies & Execution Order

- **US1 (Phase 1)**: Independent.
- **US2 (Phase 2)**: Independent of US1.
- **Polish (Phase 3)**: Depends on everything else.
