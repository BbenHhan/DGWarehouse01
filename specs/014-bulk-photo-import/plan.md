# Implementation Plan: Bulk-Import Progress Photos from Weekly Folder Structure

**Branch**: `014-bulk-photo-import` | **Date**: 2026-07-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-bulk-photo-import/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Write a new local, service-role-key admin script (`supabase/seed/import-weekly-photos.ts`, superseding the stale `supabase/seed/seed-from-v7.ts`) that walks the account holder's real folder tree at `D:\Claude\Projects\DGWarehouse\DG picture\📸 รูปภาพความคืบหน้า (Progress Photos)\`, adds the missing "doors" work-type row via a new migration, creates/reuses weeks by exact date range per (room, work type), uploads every photo/video file (recursing through any extra descriptive sub-folders) into Supabase Storage + the `photos` table using the same storage-path convention and MIME/size validation the live `uploadPhoto` Server Action already uses, skips anything already imported on a re-run, and prints a summary. Then actually execute it once against the real production Supabase project and verify the results.

## Technical Context

**Language/Version**: TypeScript, run via `npx tsx` (Node.js) — same as the existing `seed-from-v7.ts` script this one supersedes.

**Primary Dependencies**: `@supabase/supabase-js` (already a project dependency), Node `fs/promises`; reuses `lib/validation.ts` (`PHOTO_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`, `validateFile`) and `lib/database.types.ts` (`Database` type) rather than redefining them, per Constitution VIII's single-source-of-truth requirement.

**Storage**: Supabase Storage (`photos` bucket) + Postgres (`weeks`, `photos`, `work_types` tables) — the same live production project the deployed app uses (`DATA_SOURCE="supabase"`).

**Testing**: No new Vitest coverage — this is a one-time, locally-run, filesystem+network I/O script with no pure-logic surface worth unit testing in isolation (consistent with how Features 006/012/013 treated similar live-integration work). Verified by actually running it and checking real Supabase row counts/storage objects (quickstart.md).

**Target Platform**: Developer's local Windows machine, run once (repeatable) against the real Supabase project — never deployed as part of the Next.js app itself.

**Project Type**: One-off admin/data-migration script within the existing single Next.js project (not a new project/package).

**Performance Goals**: N/A — a one-time batch job over ~760 files (~2GB); no latency target, just needs to complete and be safely re-runnable.

**Constraints**: MUST NOT duplicate weeks or photos on re-run (FR-008); MUST NOT silently drop the "doors" category (FR-006); MUST reuse the app's own validation allowlist/size ceiling (Constitution VIII) so nothing is imported that the browser upload screen wouldn't also have accepted.

**Scale/Scope**: ~760 files across 10 week folders × up to 6 rooms × up to 7 work types (42 possible combinations, not all populated); one new migration adding one `work_types` row.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: N/A — no routes added; this script lives outside `app/`, same as the existing `supabase/seed/` script it supersedes.
- **II. Server Actions & Supabase Client Boundary**: The rule targets mutations *the deployed app* performs (keeping the service role key out of the browser). This script is not part of the deployed app — it's a locally-run, one-time administrative operation using the service role key read from the developer's own `.env.local`, identical in kind to the pre-existing `seed-from-v7.ts` it replaces. ✅ Consistent with established precedent, not a new exception.
- **III. Storage-Agnostic File Persistence**: ✅ Writes go through Supabase Storage using the exact same bucket (`photos`) and storage-path convention (`${weekId}/${randomUUID()}-${fileName}`) the live `uploadPhoto` Server Action uses (`app/actions/photos.ts`), so imported files are indistinguishable from ones uploaded through the UI.
- **IV. Thai-First, Mobile-First UI**: N/A — no UI.
- **V. Resilient Async UX**: N/A — no interactive UI; FR-009/FR-010 (per-file error reporting, end-of-run summary) are this script's equivalent of "no silent failures."
- **VI. Tailwind-Only Styling**: N/A.
- **VII. Multi-User Auth with Role-Based Access Control**: N/A — uses the service-role client directly (bypasses RLS by design), the same way `createServiceClient()` already does inside every mutating Server Action; no end-user auth is involved.
- **VIII. Universal File Attachments**: ✅ Reuses `lib/validation.ts`'s existing `PHOTO_MIME_TYPES` allowlist and `MAX_FILE_SIZE_BYTES`/`validateFile` instead of redefining them, so the import enforces exactly the same rules the UI's upload control does.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/014-bulk-photo-import/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this script has no external interface (no API, no CLI flags beyond the existing root-path argument); its only "contract" is the Supabase schema it writes to, already documented in `supabase/migrations/`.

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 0007_add_doors_work_type.sql   # NEW: adds the missing "doors" work_types row
└── seed/
    ├── seed-from-v7.ts                # UNCHANGED but superseded — left in place as historical
    │                                   #   record of the old (pre-Feature-002) folder layout;
    │                                   #   not deleted, not called by anything
    └── import-weekly-photos.ts        # NEW: the actual import script for this feature
```

**Structure Decision**: Single addition to the existing `supabase/seed/` convention (already established by `seed-from-v7.ts`) plus one new numbered migration following `supabase/migrations/0004_seed_lookups.sql`'s existing idempotent insert pattern. No changes anywhere under `app/`, `components/`, or `lib/` — this feature reuses those modules' existing exports rather than modifying them.

## Complexity Tracking

*No violations — this section is intentionally empty.*
