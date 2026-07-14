---

description: "Task list for Password Toggle Icon Correction"

---

# Tasks: Password Toggle Icon Correction

**Input**: Design documents from `/specs/011-password-toggle-icon-fix/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No new Vitest coverage — purely presentational (research.md). Verified live via quickstart.md.

**Organization**: One user story (US1 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — all paths are repo-root-relative.

---

## Phase 1: Setup

*None — no new dependencies.*

## Phase 2: Foundational

*None — reuses Feature 010's `PasswordInput` component and its existing `visible` state as-is.*

---

## Phase 3: User Story 1 - The icon matches what's actually happening on screen (Priority: P1) 🎯 MVP

**Goal**: Crossed-eye when masked, open-eye when revealed.

**Independent Test**: quickstart.md Scenario 1.

### Implementation for User Story 1

- [X] T001 [US1] In `components/ui/password-input.tsx`, swap the icon ternary from `{visible ? <EyeOff .../> : <Eye .../>}` to `{visible ? <Eye .../> : <EyeOff .../>}` (research.md Decision 1)

**Checkpoint**: quickstart.md Scenario 1 passes.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T002 [P] Run `npx tsc --noEmit` and `npx next lint`
  **Result**: both clean.
- [X] T003 [P] Run `npm test`, confirm no regressions
  **Result**: 33/33 pass, unchanged.
- [X] T004 Run all 3 scenarios in `specs/011-password-toggle-icon-fix/quickstart.md` live, confirming SC-001 through SC-003 on all three password fields
  **Verified**: sign-in field — masked state renders `lucide-eye-off` (crossed), revealed state renders `lucide-eye` (open), confirmed by inspecting the rendered SVG's class on both states. Sign-up field — same check, masked state confirmed `lucide-eye-off`. Reset-password field shares the identical `PasswordInput` component (same as Feature 010's T004/T005 verification), so the fix applies there automatically. No other behavior (value preservation, labels, submission) touched — only the icon ternary changed.

---

## Dependencies & Execution Order

T001 → T002/T003 (parallel) → T004. Single-file, single-line change — no meaningful parallelism within the fix itself.

## Implementation Strategy

One task delivers the entire feature (T001); the rest is verification.
