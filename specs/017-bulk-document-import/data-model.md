# Data Model: Bulk Document Import

No schema changes. This feature writes only to two already-existing tables (`document_categories`, `documents`), both defined in `supabase/migrations/0001_schema.sql` and already seeded correctly by `supabase/migrations/0004_seed_lookups.sql`.

## Existing entities used (unchanged)

### `document_categories` (read-only in this feature)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | unique — the 4 known values this feature's lookup table targets: `structure`, `electrical`, `environment`, `safety` |
| `name_th` | text | |
| `emoji` | text | |
| `sort_order` | int | |

### `documents` (written by this feature)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, generated |
| `category_id` | uuid | FK → `document_categories.id`; resolved via Decision 1's lookup table |
| `storage_path` | text | `${categoryId}/${randomUUID()}-${sanitizeForStorageKey(fileName)}` — same convention `uploadDoc` uses |
| `file_name` | text | The file's original on-disk name, unmodified (Decision 4 — sanitization only touches the storage key, never this column) |
| `note` | text, nullable | The immediate sub-folder name (Decision 2), or `null` if the file sits directly in the category root |
| `created_at` / `updated_at` | timestamptz | Defaulted by the table, not set explicitly by the import |

## Import-run-local types (script-internal, not persisted)

```ts
type Summary = {
  documentsUploaded: number;
  documentsSkippedDuplicate: number;
  documentsSkippedInvalid: Array<{ filePath: string; reason: string }>;
  categoriesSkipped: string[]; // top-level folder names with no lookup-table match
};
```

No new database migration, no new TypeScript types beyond this script-local `Summary` (mirrors `import-weekly-photos.ts`'s own `Summary` type, scoped down since there's no week-creation counter needed here).
