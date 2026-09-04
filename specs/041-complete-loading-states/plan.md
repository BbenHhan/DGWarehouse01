# Implementation Plan: Complete Loading States

**Branch**: `feature/040-editable-document-taxonomy` (see Branching note) | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-complete-loading-states/spec.md`

## Summary

Eleven places in the app wait on the network and say nothing while they do. This feature
gives each of them a visible state, using the spinner and skeleton building blocks already
in the codebase rather than new ones.

Three pieces of shared machinery carry most of the work: a hook that holds an indicator
back ~150 ms and then keeps it up long enough to read; a `busy` prop on the shared
`SelectTrigger` that swaps its chevron for a spinner without moving the row; and a
progress-reading fetch used by the document preview. Everything else is a call site.

Two decisions constrain the design and both came from the account holder: progress is
reported as a real share for documents and video, and images keep `next/image`'s
screen-appropriate sizing instead of a percentage.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Tailwind CSS v4, shadcn/ui on Base UI primitives, lucide-react,
sonner. No new dependency.

**Storage**: none — this feature adds no table, column, migration, or stored file

**Testing**: Vitest; component tests run under jsdom via a per-file docblock, with
Testing Library

**Target Platform**: mobile browsers first (375 px), desktop as progressive enhancement

**Project Type**: web application

**Performance Goals**: an indicator appears within ~150 ms of a wait beginning and never
for a wait shorter than that (FR-013); no screen area blank for more than a second without
explanation (SC-002)

**Constraints**: no layout shift when an indicator appears (SC-010); a video must still
start before it is fully downloaded and stay seekable (FR-014d, SC-011); a document must
be downloaded once, not twice (FR-014b)

**Scale/Scope**: 11 existing components, 1 new hook, 1 new helper, 1 changed shared
primitive

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Note |
|---|---|---|
| I. App Router Only | PASS | no routing change; the page-level loading screens already in place are untouched |
| II. Server Actions & Supabase Client Boundary | PASS | no new data access; this feature only observes actions that already exist |
| III. Storage-Agnostic File Persistence | PASS | the preview reads a public file URL as it does today; `fetchWithProgress` changes how bytes are observed, not where they come from, and the direct-URL fallback keeps the existing path intact |
| IV. Thai-First, Mobile-First UI | PASS | all added wording is Thai (SC-007); FR-011, FR-012a and SC-010 make 375 px a hard constraint, and Scenario 9 checks it |
| V. Resilient Async UX | **This is the principle the feature exists to satisfy** | the current code violates it in 11 places; FR-009 preserves the optimistic-delete rule so this feature does not "fix" one clause by breaking another |
| VI. Tailwind-Only Styling | PASS | indicators are Tailwind classes on the existing primitives; no CSS file, no inline style |
| VII. RBAC | PASS | no control's availability changes; a viewer sees exactly what a viewer saw |
| VIII. Universal File Attachments | PASS | no change to what can be attached; the preview keeps its fallback for types the browser will not render |

**Gate result: PASS — no violation to justify.**

**Post-design re-check**: unchanged. The one design decision with the potential to breach a
principle was buffering video through `fetch` to report a tidy percentage, which would have
cost instant playback and seeking. Research §5 rejects it and FR-014d forbids it.

## Project Structure

### Documentation (this feature)

```text
specs/041-complete-loading-states/
├── plan.md              # This file
├── spec.md
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── loading-primitives.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — created by /speckit-tasks, not here
```

### Source code

```text
lib/
├── use-delayed-busy.ts          # NEW — the 150 ms delay and the visibility floor
└── fetch-with-progress.ts       # NEW — streaming download used by the document preview

components/ui/
└── select.tsx                   # CHANGED — new `busy` prop on SelectTrigger

components/                      # call sites, one per waiting interaction
├── ChecklistList.tsx            # status control, add, delete — per-row scoping needed
├── RoomChecklistBox.tsx         # status controls — per-row scoping needed
├── AccountMenu.tsx              # sign out, request edit access
├── UserRoleTable.tsx            # role control
├── PendingRequestsList.tsx      # approve / deny
├── PhotoGrid.tsx                # image tiles
├── DocList.tsx                  # document preview: document, video, image
├── UnsortedFileTray.tsx         # thumbnails
├── DocumentUploadWorkspace.tsx  # thumbnails
└── MobileSwipeCard.tsx          # thumbnail

app/login/
└── page.tsx                     # sign in, sign up, password reset

tests/                           # alongside the existing component tests
```

## Implementation order

1. **Shared machinery first** — `useDelayedBusy`, the `SelectTrigger` `busy` prop, and
   `fetchWithProgress`, each with its own tests. Every later step depends on these, and
   getting the two timers wrong would be wrong in eleven places at once.
2. **Per-row scoping** — `ChecklistList` and `RoomChecklistBox` move from one shared
   transition to a tracked row id. This is a correctness fix (FR-004) and is worth doing
   before adding indicators, so the indicators are attached to state that is already right.
3. **Simple call sites** — account menu, role table, pending requests, and the three
   login-screen forms. Small, independent, each testable on its own.
4. **The document preview** — the largest single piece, and the only one that changes how
   a file reaches the screen. Kept last among the writes so a mistake here cannot obscure
   the rest.
5. **Image placeholders** — photo grid, tray, workspace, swipe card.

## Risks

| Risk | Mitigation |
|---|---|
| The blob-URL preview breaks the download fallback for browsers that will not render PDFs | FR-014b makes it a requirement; quickstart Scenario 4 step 3 checks it explicitly |
| A blob URL is leaked each time a preview opens | Revoke on close and on unmount; called out in the contract |
| `Content-Length` missing on a compressed response leaves the share unknowable | FR-014a already specifies the fallback: report bytes received, no percentage |
| The two timers in `useDelayedBusy` make tests time-dependent and flaky | Fake timers in its unit tests; feature 040 already produced one flaky timing test, so this is a known trap here |
| Per-row scoping changes touch working checklist code | These components have existing tests; run them before and after rather than only after |

## Branching note

Feature 040 is still unmerged — 26 commits, and `main` currently runs code that reads a
column the 040 migration dropped. This feature builds directly on 040's spinner and
skeleton primitives, so it cannot branch from `main` as it stands. Work continues on the
040 branch unless the account holder decides otherwise; the merge question is theirs and
is raised separately.
