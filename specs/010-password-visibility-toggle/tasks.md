---

description: "Task list for Password Visibility Toggle"

---

# Tasks: Password Visibility Toggle

**Input**: Design documents from `/specs/010-password-visibility-toggle/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — purely presentational, no business logic to unit-test (research.md Decision 4). Verified live via quickstart.md.

**Organization**: Tasks are grouped by user story (US1–US2 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*No setup tasks — no new dependencies (`lucide-react` already in use).*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the one shared component every story depends on (FR-003).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Create `components/ui/password-input.tsx`: a `PasswordInput` component wrapping the existing `Input` (`components/ui/input.tsx`) in a `relative` container; local `visible: boolean` state (default `false`); renders `Input` with `type={visible ? "text" : "password"}` and right-side padding to clear the button; an absolutely-positioned `<button type="button">` toggling `visible`, with `aria-label` stating the next action ("แสดงรหัสผ่าน" when hidden / "ซ่อนรหัสผ่าน" when visible — research.md Decision 3), rendering `lucide-react`'s `Eye` icon when hidden and `EyeOff` when visible; forwards all other props to the underlying `Input` (so existing `value`/`onChange`/`required`/`placeholder` usage needs no changes at call sites beyond the import/tag swap)

**Checkpoint**: `npx tsc --noEmit` clean; component renders and toggles in isolation.

---

## Phase 3: User Story 1 - See what was typed before submitting (Priority: P1) 🎯 MVP

**Goal**: Every password field can be revealed and re-hidden without affecting its value.

**Independent Test**: Type into any password field, toggle reveal, confirm the value is visible and unchanged, toggle again, confirm masked again.

### Implementation for User Story 1

- [X] T002 [P] [US1] In `app/login/page.tsx`, replace the sign-in form's `<Input type="password" .../>` with `<PasswordInput .../>` (same props otherwise), importing `PasswordInput` from `@/components/ui/password-input`
- [X] T003 [P] [US1] In `app/login/page.tsx`, replace the sign-up form's `<Input type="password" .../>` with `<PasswordInput .../>` the same way
- [X] T004 [P] [US1] In `app/reset-password/page.tsx`, replace the new-password `<Input type="password" .../>` with `<PasswordInput .../>` the same way

**Checkpoint**: quickstart.md Scenario 1 passes on all three fields.

---

## Phase 4: User Story 2 - Every password field behaves identically (Priority: P2)

**Goal**: Confirm the three swapped fields are visually and behaviorally identical — this falls out of T002–T004 all using the same `PasswordInput` component, so this phase is verification, not new code.

**Independent Test**: Compare the control across all three fields.

### Implementation for User Story 2

- [X] T005 [US2] Live-verify (quickstart.md Scenario 2): confirm the reveal control on the sign-in, sign-up, and reset-password fields is visually identical and behaves identically, since all three now render the same `PasswordInput` component from T001
  **Verified**: sign-in and sign-up fields tested live (identical "แสดงรหัสผ่าน"/"ซ่อนรหัสผ่าน" control, identical toggle behavior). `/reset-password` requires an active recovery session to view (pre-existing middleware behavior, unrelated to this feature) so it couldn't be reached directly in this pass — its code change is byte-identical to the other two, using the exact same `PasswordInput` component.

**Checkpoint**: quickstart.md Scenario 2 passes.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T006 [P] Run `npx tsc --noEmit` and `npx next lint`, fix any resulting errors
  **Result**: both clean.
- [X] T007 [P] Run `npm test` and confirm the full existing suite still passes with no regressions (no new tests added)
  **Result**: 33/33 tests pass, unchanged.
- [X] T008 Run all 4 scenarios in `specs/010-password-visibility-toggle/quickstart.md` end-to-end as a final live-verification check, including Scenario 3 (keyboard operability) and Scenario 4 (no regression in sign-in/sign-up/reset submission)
  **Verified**: Scenario 1 (typed "MySecret123" into the sign-in field, toggled to plain text — value byte-identical, toggled back to masked — value still identical); Scenario 2 (see T005); Scenario 3 (the toggle is a real native `<button type="button">` with no custom key handling, so Enter/Space activation is guaranteed by the browser — confirmed by focusing it and activating, state toggled correctly); Scenario 4 (sign-in/sign-up/reset submission logic is untouched — only the `Input` → `PasswordInput` tag swap changed, `handleSignIn`/`handleSignUp`/`handleSubmit` bodies are unmodified).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories — `PasswordInput` (T001) must exist before any call site can use it.
- **User Story 1 (Phase 3)**: Depends on Foundational. T002/T003/T004 touch different files and are independent of each other.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (verifies its output).
- **Polish (Phase 5)**: Depends on US1–US2 being complete.

### Parallel Opportunities

- T002, T003, and T004 all touch different files (well, T002/T003 share `app/login/page.tsx` — sequential between those two; T004 is a separate file and can run in parallel with both).
- T006 and T007 (Polish) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational — `PasswordInput`).
2. Complete Phase 3 (US1 — all three fields swapped).
3. **STOP and VALIDATE**: run quickstart.md Scenario 1 on each field.
4. This alone delivers the entire feature; US2 is a consistency check on the same work, not additional capability.

### Incremental Delivery

1. Foundational → US1 (the feature itself) → US2 (consistency verification) → Polish.
