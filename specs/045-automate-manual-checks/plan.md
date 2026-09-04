# Implementation Plan: Automate the Checks Nobody Can Run

**Branch**: `feature/040-editable-document-taxonomy` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Seventeen checks across features 040–044 were left to a manual walkthrough that needs a
signed-in editor. None has been run. Two of them guard things that matter — whether the
server actually refuses a viewer, and whether the guards around deleting documents hold —
and both are fully checkable without a browser.

The work is to write those checks against the project's local backend, plus three
interaction rules that were only ever described, and then to shorten the manual list to
the entries that genuinely need a person, each saying why.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15

**Primary Dependencies**: Vitest, Testing Library. No new dependency.

**Storage**: the local JSON backend the suite already uses; no schema or data change

**Testing**: Vitest — node by default, jsdom per file via a docblock

**Project Type**: web application

**Performance Goals**: none; the suite must stay fast enough to run on every change

**Constraints**: no live data (FR-011); no real-clock dependence (FR-012); no weakening of
the behaviour under test (spec Edge Cases)

**Scale/Scope**: 3 new test files, 2 existing ones extended, 5 tasks.md updated

## Constitution Check

| Principle | Verdict | Note |
|---|---|---|
| I. App Router Only | PASS | no routing change |
| II. Server Actions & Supabase Client Boundary | PASS | the actions are exercised as they are; the Supabase client is stubbed to throw, so a test taking that path fails loudly rather than silently reaching for a network |
| III. Storage-Agnostic Parity | **The principle this leans on** | the local backend exists so behaviour can be exercised without Supabase, which is exactly what makes these checks possible at all |
| IV. Thai-First, Mobile-First | PASS | assertions match the Thai messages the user sees, so a wording change that breaks the UI breaks a test |
| V. Resilient Async UX | PASS | FR-007's rejected-write checks are this principle's own claim, tested rather than asserted |
| VI. Tailwind-Only | PASS | no styling |
| VII. RBAC | **What Story 1 exists to prove** | FR-003 checks the gate asks for `editor`, so a future change to `admin` — which would breach Constitution VII by giving admin a second exclusive power — fails a test |
| VIII. Universal File Attachments | PASS | not applicable |

**Gate result: PASS.**

## Phase 0: Research

**Decision**: Exercise the Server Actions for real against the local backend, mocking only
the boundary that cannot exist in a test: the rights check and the cache revalidation.

**Rationale**: The interesting failures live between the gate, the validation, the guards
and the write. Mocking the actions themselves would assert only that the test's own mocks
were called. Pointing the data source at the local backend runs the real path end to end.

**Alternatives considered**: A Supabase test project — rejected: it needs credentials the
suite cannot have, and it would make the checks depend on a network. Mocking the Supabase
client — rejected: the mock would have to reimplement the query behaviour being tested.

**Decision**: The stubbed Supabase client throws if constructed.

**Rationale**: A test that silently took the Supabase path would pass by accident. Throwing
turns that into an immediate, obvious failure.

**Decision**: Timing-dependent behaviour uses fake timers.

**Rationale**: FR-012. The reorder-burst and delayed-indicator rules are about ordering, not
duration; a real-clock test of either is the flake that gets deleted six months later.

**Decision**: Video progress is checked by driving the player's own events and buffered
ranges rather than loading a file.

**Rationale**: jsdom has no media pipeline, so the check has to be about what the component
does with what the player reports — which is exactly the rule FR-010 states.

## Phase 1: Design

No data model, no contract — this feature adds no interface. What it adds is coverage:

| Behaviour | Where checked | Replaces manual |
|---|---|---|
| Every action refuses without edit rights | Server Action tests | 040-T051 |
| Unauthenticated distinguishable from disallowed | Server Action tests | 040-T051 |
| Gate asks for editor, not admin | Server Action tests | — (Constitution VII) |
| Delete guards: empty-claim, agreed-count, destination-inside | Server Action tests | 040-T050 |
| Move-then-delete relocates all, destroys none | Server Action tests | 040-T050, 040-T032 (partly) |
| Category delete cascades to sub-groups | Server Action tests | 040-T050 |
| Rejected write states why, stored state unchanged | Server Action tests | 040-T054 |
| Rename keeps documents and slug | Server Action tests | 040-T022, 040-T037 |
| Unsubmitted typing survives management mode | ManageMode tests | 040-T052 |
| Reorder burst settles in order | ManageMode tests | 040-T027 |
| Video reports progress without withholding playback | Preview tests | 041-T041 |

### Source code

```text
app/actions/
└── document-taxonomy.test.ts     # NEW — the gate, the guards, the rejections

components/
├── ManageModeProvider.test.tsx   # NEW — draft survival, serialised reordering
└── DocList.test.tsx              # EXTENDED — video progress and playback

specs/04*/tasks.md                # each manual entry either removed or given its reason
```

## Risks

| Risk | Mitigation |
|---|---|
| A check passes against broken code, removing suspicion without adding safety | SC-005: each is shown to fail when its behaviour is reverted, and that is done rather than assumed |
| The local and Supabase paths diverge, so a green suite says nothing about production | Named honestly: these checks cover the local path. The Supabase path for 043 was verified against live data separately, and the manual list keeps the entries that only production can answer |
| The reorder check asserts the implementation rather than the rule | Assert the settled order and the absence of overlap, not the queue's internals |
| The manual list gets shorter without getting more honest | FR-013 requires a reason on every survivor, and SC-003 checks it |
