# Quickstart: Bulk Document Import

## Prerequisites

- `.env.local` has a live `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already the case — confirmed working after the Supabase project restore earlier this session).
- The source folder tree exists at `D:\Claude\Projects\DGWarehouse\DG picture\` with its 4 `หมวดที่ N ...` category folders.
- `document_categories` already seeded with the 4 rows from `supabase/migrations/0004_seed_lookups.sql` (already true in production).

## Run the import

```bash
npx tsx supabase/seed/import-documents.ts "D:\Claude\Projects\DGWarehouse\DG picture"
```

Reads `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from the environment (same as `import-weekly-photos.ts`).

## Validation scenarios

### Scenario 1 — First run imports everything currently organized (US1, SC-001)

1. Run the command above against the real folder tree.
2. Check the printed summary: `documentsUploaded` should equal the number of valid files currently on disk under the 4 category folders (31 + 1 + 1 + 0 = 33 at last inspection, minus any that fail validation).
3. Open `/documents/structure`, `/documents/electrical`, `/documents/environment`, `/documents/safety` in the app (signed in) and confirm the imported files appear, with recognizable original file names, and open/download successfully.
4. Confirm a document imported from a sub-folder (e.g. anything under "1.2 งานผนังและกำแพงกันไฟ (Firewalls)") shows that sub-folder name as its note in the UI.

### Scenario 2 — Re-run is a no-op when nothing changed (US2, SC-002)

1. Immediately re-run the same command.
2. Confirm the summary shows `documentsUploaded: 0` and `documentsSkippedDuplicate` equal to the total from Scenario 1.
3. Confirm no new rows appear in any category page — counts are identical to after Scenario 1.

### Scenario 3 — New files added later are picked up (US2, SC-003)

1. Add one new file to an existing sub-folder, and one new file directly in `หมวดที่ 4 ...` (the currently-empty safety category) with no sub-folder.
2. Re-run the command.
3. Confirm the summary shows `documentsUploaded: 2`, and both appear in the app — the safety-category one with no note, the sub-folder one with its note set.
4. Confirm every previously-imported document is still present exactly once (not duplicated).

### Scenario 4 — Unsupported file type is reported, not silently dropped (US3, SC-004)

1. Add a file with an unsupported extension (e.g. `.exe`) into any category sub-folder.
2. Re-run the command.
3. Confirm the summary explicitly lists that file path and a validation-failure reason under skipped/invalid, and that every other new valid file in the same run still imported successfully.

### Scenario 5 — Unmatched top-level folder is skipped safely (Edge Case)

1. Temporarily rename one category folder (or note that this is inspectable by reading the script's lookup table against the actual folder names) — confirm the lookup table's 4 exact strings all match the real folder names on disk (already verified during planning; this scenario is a design-time check, not something requiring a live mutation of the account holder's real folders).
2. Confirm the script's behavior on a genuinely unmatched folder name (verified via code reading / a scratch temp folder, not the real data) is: skip with a warning printed, run continues, no error/crash.

## Expected final state

- `documents` table has one row per valid file found under the 4 category folders.
- No changes to `photos`, `weeks`, `rooms`, `work_types`, or any user/auth table.
- The account holder's original files on disk are untouched (script is read-only against the source).
