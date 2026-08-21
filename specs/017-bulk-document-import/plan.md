# Implementation Plan: Bulk Document Import

**Branch**: `main` (no feature branch — this project ships features directly to `main`, per established repo convention) | **Date**: 2026-07-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-bulk-document-import/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Write a new local, service-role-key admin script (`supabase/seed/import-documents.ts`) that walks the account holder's real folder tree at `D:\Claude\Projects\DGWarehouse\DG picture\`, matches each of its 4 top-level folders to the app's existing `document_categories` rows via an explicit lookup table, recurses into any sub-folders (recording the immediate sub-folder name as the resulting document's `note`, or leaving `note` null for files sitting directly in a category folder), uploads every accepted file into Supabase Storage + the `documents` table using the exact same storage-path convention and MIME/size validation the live `uploadDoc` Server Action already uses (`app/actions/documents.ts`), skips anything already imported on a re-run (matched by category + note + file name), and prints a summary. Then actually execute it once against the real production Supabase project and verify the results.

## Technical Context

**Language/Version**: TypeScript, run via `npx tsx` (Node.js) — same tooling as `supabase/seed/import-weekly-photos.ts` (Feature 014), which this feature closely mirrors.

**Primary Dependencies**: `@supabase/supabase-js` (already a project dependency), Node `fs/promises`; reuses `lib/validation.ts` (`DOCUMENT_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`, `validateFile`) and `lib/database.types.ts` (`Database` type) rather than redefining them, per Constitution VIII's single-source-of-truth requirement.

**Storage**: Supabase Storage (`documents` bucket) + Postgres (`documents`, `document_categories` tables) — the same live production project the deployed app uses (`DATA_SOURCE="supabase"`). No schema change — both tables already exist and `document_categories` is already seeded correctly (`supabase/migrations/0004_seed_lookups.sql`).

**Testing**: No new Vitest coverage — this is a one-time, locally-run, filesystem+network I/O script with no pure-logic surface worth unit testing in isolation (consistent with how Feature 014 treated the equivalent photo-import script). Verified by actually running it and checking real Supabase row counts/storage objects (quickstart.md).

**Target Platform**: Developer's local Windows machine, run once (repeatable) against the real Supabase project — never deployed as part of the Next.js app itself.

**Project Type**: One-off admin/data-migration script within the existing single Next.js project (not a new project/package).

**Performance Goals**: N/A — a one-time batch job over the ~33 files currently organized on disk (structure: 31, electrical: 1, environment: 1, safety: 0), growing as the account holder organizes more; no latency target, just needs to complete and be safely re-runnable.

**Constraints**: MUST NOT duplicate documents on re-run (FR-006); MUST skip unmatched top-level folders and empty category folders without failing the run (edge cases, FR-010); MUST reuse the app's own validation allowlist/size ceiling (Constitution VIII) so nothing is imported that the browser upload screen wouldn't also have accepted; MUST NOT touch `photos`/`weeks`/rooms/work_types (FR-009) — this script only ever reads the 4 category-root folders, never the sibling "📸 รูปภาพความคืบหน้า (Progress Photos)" folder Feature 014 already owns.

**Scale/Scope**: ~33 files currently across 4 category folders (up to 5 sub-folders deep in the largest category); no new migration needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. App Router Only**: N/A — no routes added; this script lives outside `app/`, same as `supabase/seed/import-weekly-photos.ts`.
- **II. Server Actions & Supabase Client Boundary**: The rule targets mutations *the deployed app* performs (keeping the service role key out of the browser). This script is not part of the deployed app — it's a locally-run, one-time administrative operation using the service role key read from the developer's own `.env.local`, identical in kind to Feature 014's already-accepted precedent. ✅ Consistent with established precedent, not a new exception.
- **III. Storage-Agnostic File Persistence**: ✅ Writes go through Supabase Storage using the exact same bucket (`documents`) and storage-path convention (`${categoryId}/${randomUUID()}-${sanitizedFileName}`) the live `uploadDoc` Server Action uses, so imported files are indistinguishable from ones uploaded through the UI.
- **IV. Thai-First, Mobile-First UI**: N/A — no UI.
- **V. Resilient Async UX**: N/A — no interactive UI; FR-008 (per-file error reporting, end-of-run summary) is this script's equivalent of "no silent failures."
- **VI. Tailwind-Only Styling**: N/A.
- **VII. Multi-User Auth with Role-Based Access Control**: N/A — uses the service-role client directly (bypasses RLS by design), the same way `createServiceClient()` already does inside every mutating Server Action; no end-user auth is involved.
- **VIII. Universal File Attachments**: ✅ Reuses `lib/validation.ts`'s existing `DOCUMENT_MIME_TYPES` allowlist and `MAX_FILE_SIZE_BYTES`/`validateFile` instead of redefining them, so the import enforces exactly the same rules the UI's upload control does.

No violations — Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/017-bulk-document-import/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory — this script has no external interface (no API, no CLI flags beyond the existing root-path argument, same convention as Feature 014's script); its only "contract" is the Supabase schema it writes to, already documented in `supabase/migrations/0001_schema.sql` and `0004_seed_lookups.sql`.

### Source Code (repository root)

```text
supabase/
└── seed/
    └── import-documents.ts        # NEW: the import script for this feature
```

**Structure Decision**: Single addition to the existing `supabase/seed/` convention (already established by `import-weekly-photos.ts`). No changes anywhere under `app/`, `components/`, or `lib/` — this feature reuses those modules' existing exports rather than modifying them. No new migration — `document_categories` and `documents` already exist and are already correctly seeded.

## Complexity Tracking

*No violations — this section is intentionally empty.*
