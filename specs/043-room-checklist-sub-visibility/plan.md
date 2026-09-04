# Implementation Plan: A Room Sees the Sub-Items That Belong to It

**Branch**: `feature/040-editable-document-taxonomy` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

A room's checklist is found by asking for top-level entries tagged to that room, then
fetching their sub-items. An entry with no room of its own is therefore never found, and
its sub-items — tagged to real rooms, holding real work — are unreachable from every room
page in the app.

The fix widens the first question: an entry belongs on a room's page when it is tagged to
that room **or** when any of its sub-items is. The second step, which already filters
sub-items down to the room, is unchanged and does the rest.

Verified against the live data before planning: one entry, no room tag, two sub-items tagged
to two rooms, and both room pages return nothing.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15 (App Router)

**Primary Dependencies**: Supabase JS. No new dependency.

**Storage**: Postgres via Supabase, plus the local JSON store the test suite runs on.
**No schema change and no data change** — nothing is retagged; the defect is in what is
looked for, not in what is stored.

**Testing**: Vitest; the local store backs the data-layer tests

**Target Platform**: mobile browsers first

**Project Type**: web application

**Constraints**: Constitution III — the local store and Supabase must agree, so both
implementations change together and the parity tests cover both

**Scale/Scope**: 2 data-layer functions, 1 component, no new files

## Constitution Check

| Principle | Verdict | Note |
|---|---|---|
| I. App Router Only | PASS | no routing change |
| II. Server Actions & Supabase Client Boundary | PASS | reads stay in the data layer; no new client access |
| III. Storage-Agnostic Parity | **The principle this touches** | `lib/data.ts` and `lib/local/store.ts` must return the same shape for the same data; both are changed together and tested together |
| IV. Thai-First, Mobile-First | PASS | no new copy, no layout change |
| V. Resilient Async UX | PASS | untouched |
| VI. Tailwind-Only | PASS | no styling change |
| VII. RBAC | PASS | this widens what is *found*, not who may see it. A viewer sees the same entries a viewer would already see on the sitewide checklist |
| VIII. Universal File Attachments | PASS | not applicable |

**Gate result: PASS.**

## Phase 0: Research

**Decision**: Find the room's entries in two steps — collect the ids of entries reachable
through a tagged sub-item, then fetch top-level entries whose id is in that set or which
carry the room's tag themselves.

**Rationale**: The current query expresses "entries tagged to this room" as an inner join,
which cannot also express "or whose child is tagged". Two reads keep each query simple and
keep the existing sub-item filter untouched — the part that already works.

**Alternatives considered**: A single query with an `or` across a joined table — rejected,
it makes the room filter apply to either the parent's or the child's tag in one expression
that is hard to read and easy to get subtly wrong. Retagging parents in the database so the
existing query finds them — rejected outright: it changes the user's data to suit a query,
and an entry that deliberately covers no single room would be given rooms it does not have.

**Decision**: An entry reaching the room only through its sub-items shows its status as a
rollup rather than a control.

**Rationale**: FR-010. It has no room tag here, so there is no per-room record to write —
a control would write nowhere (SC-003). The sitewide checklist already presents an entry
with sub-items this way, so this is the app's existing rule rather than a new one.

## Phase 1: Design

No data model change. Both backends implement the same widened rule:

| Entry | Appears on room R's page? | Sub-items listed |
|---|---|---|
| tagged to R | yes, as today | those belonging to R |
| not tagged to R, a sub-item tagged to R | **yes — this is the fix** | only those belonging to R |
| not tagged to R, no sub-item in R | no | — |
| tagged to R, all sub-items elsewhere | yes | none |

"Belongs to R" keeps its meaning: carries R's tag, or carries no tag and inherits (FR-007).
Finished work drops off under today's rule (FR-006).

### Source code

```text
lib/
├── data.ts                      # CHANGED — getRoomChecklistItems: widen the first query
└── local/store.ts               # CHANGED — the same rule, for parity (Constitution III)

components/
└── RoomChecklistBox.tsx         # CHANGED — an untagged parent shows a rollup, not a control
```

## Risks

| Risk | Mitigation |
|---|---|
| The two backends drift, so tests pass on local and the app is still broken on Supabase | Constitution III; T002 and T003 change them together, and T007 asserts the same expectations against the local store that the live probe confirmed for Supabase |
| A parent now appears on many room pages at once, surprising someone who expected one | That is the intent: an entry covering four rooms should be visible in all four. Called out here so it is a decision on the record, not a surprise |
| The room box offers a status control for a parent it cannot write | FR-010, SC-003; T004 removes it for exactly that case |
| Finished entries start reappearing through a stale sub-item | T006 covers the finished-work rule explicitly |
