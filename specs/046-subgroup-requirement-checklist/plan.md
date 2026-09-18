# Implementation Plan: Sub-group Requirement Checklist

**Branch**: `feature/040-editable-document-taxonomy` | **Date**: 2026-09-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/046-subgroup-requirement-checklist/spec.md`

## Summary

Give every document sub-group an optional one-line description and an ordered list of
requirement items, each marked มีแล้ว / ยังขาด / รอดำเนินการ with an optional note — shown
on the sub-group's row without expanding it, and editable by editors in the existing
management mode. One migration adds `description` to categories and sub-groups, a
`document_group_requirements` table, and loads หมวด 6's audited content from the spec
appendix. The uncommitted 0015 description draft is the starting point for the columns and
the rendering; its seed wording is discarded (FR-019).

## Technical Context

**Language/Version**: TypeScript / Next.js 15.5 (App Router), React 19.

**Primary Dependencies**: None new. Inputs, buttons, spinner and toasts exist; reordering
reuses `ReorderButtons` and the `ManageModeProvider` write queue; inline editing reuses
`EditableName`.

**Storage**: One migration, `0015_group_requirements.sql`, replacing the unapplied draft
`0015_taxonomy_descriptions.sql` (0016 is taken by the fire-alarm work type). The live
project has no DDL path from this machine — no database URL, no Supabase CLI — so, as with
0014, the account holder pastes it into the Supabase SQL Editor. The code must therefore
run correctly **before** the migration exists (research Decision 4). The `local` backend
gains a `groupRequirements` array and optional `description` fields in `db.json`.

**Testing**: Vitest. Local-store tests for CRUD, ordering and cascade; Server Action tests
on the `local` backend with the rights check mocked (the `document-taxonomy.test.ts`
pattern); jsdom component tests for viewing and editing; a test that the migration's seed
matches the spec appendix item for item (SC-002).

**Target Platform**: Same Next.js app on Vercel; phones first (Constitution IV).

**Project Type**: Web application, single Next.js project.

**Performance Goals**: One extra read per category page (every requirement row for the
category's sub-groups, a few dozen rows); no perceptible change in page load.

**Constraints**: Must not break the live page while the migration is still unapplied.
Must not display any count by status (FR-006). Must not alter documents.

**Scale/Scope**: 1 migration, 1 new Server Action module (6 actions), 1 new data-layer
read, local-store functions, 2 new client components, edits to `DocList`, the category
layout, `CategoryManagePanel`, types and validation. หมวด 6 seed: 1 category description, 12 sub-group descriptions, 45 items.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- **I. App Router Only**: ✅ No new routes. Everything renders on `/documents/[categorySlug]`.
- **II. Server Actions & Supabase Client Boundary**: ✅ All six mutations are Server Actions
  in `app/actions/group-requirements.ts`, using the service-role client server-side only.
- **III. Storage-Agnostic Persistence**: ✅ `local` implements the same contract in
  `lib/local/store.ts`; `mock` reports no descriptions and no items and refuses writes, as
  it does for the rest of the taxonomy. No files are stored by this feature.
- **IV. Thai-First, Mobile-First**: ✅ All labels Thai; item rows wrap at 375px; the status
  control is three tap targets rather than a dropdown.
- **V. Resilient Async UX**: ✅ Status changes and deletes are optimistic with rollback and
  a toast on failure (FR-014); adds and text edits show a delayed spinner.
- **VI. Tailwind-Only Styling**: ✅ Utility classes only; status colours come from existing
  theme tokens.
- **VII. RBAC**: ✅ Every action calls `requireRole("editor")` before touching data; viewers
  and signed-out callers are refused server-side (FR-013).
- **VIII. Universal File Attachments**: ✅ Not engaged. Requirement items are annotations on
  an existing module (documents), which already has its upload control; an item holds no
  file and is not a new module.

**Post-design re-check**: ✅ No violations introduced by the data model or contracts.
Decision 4 (tolerating a missing table) is a read-side fallback, not a second code path
for writes.

## Project Structure

### Documentation (this feature)

```text
specs/046-subgroup-requirement-checklist/
├── spec.md
├── plan.md                    # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── server-actions.md
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0015_group_requirements.sql        # replaces 0015_taxonomy_descriptions.sql

lib/
├── types.ts                           # GroupRequirement, RequirementStatus; description on category/group
├── validation.ts                      # requirement + description schemas
├── database.types.ts                  # new table and columns
├── data.ts                            # getGroupRequirements(categoryId)
├── requirement-status.ts              # status → Thai label, icon, tone (shared by view and edit)
├── requirement-seed.test.ts           # migration seed ≡ spec appendix
└── local/
    ├── store.ts                       # groupRequirements + descriptions, cascade on delete
    └── group-requirements.test.ts

app/
├── actions/
│   ├── group-requirements.ts          # add/update/delete/move item, set group/category description
│   └── group-requirements.test.ts
└── (app)/documents/[categorySlug]/
    ├── layout.tsx                     # category description (from the draft)
    └── page.tsx                       # passes requirements to DocList

components/
├── GroupRequirements.tsx              # read-only list under a sub-group row
├── GroupRequirementsEditor.tsx        # management-mode editor for description + items
├── GroupRequirements.test.tsx
├── DocList.tsx                        # renders the above outside the collapse trigger
└── CategoryManagePanel.tsx            # category description field
```

**Structure Decision**: Single Next.js project, following the layout features 040–045
already use: actions in `app/actions`, backend split in `lib/data.ts` + `lib/local/store.ts`,
client components in `components/`, tests beside the code they cover.

## Complexity Tracking

No constitution violations to justify.
