# Research: Bulk Document Import

## Decision 1: Category folder → `document_categories.slug` mapping

**Decision**: A small explicit lookup table (folder name → slug), same style as `import-weekly-photos.ts`'s `ROOM_FOLDER_TO_SLUG`/`WORK_TYPE_FOLDER_TO_SLUG`, hard-coded for the 4 known folder names:

```
"หมวดที่ 1 โครงสร้างอาคารและสถาปัตยกรรม (Civil & Structural)" → "structure"
"หมวดที่ 2 ระบบไฟฟ้าและการป้องกันอัคคีภัย (Electrical & Fire Protection)" → "electrical"
"หมวดที่ 3 ระบบควบคุมสิ่งแวดล้อมและการจัดการสารเคมี (Environmental & Spill Control)" → "environment"
"หมวดที่ 4 ความปลอดภัยในการทำงานและป้ายสัญลักษณ์ (Occupational Safety & Signage)" → "safety"
```

**Rationale**: These are the exact 4 folder names confirmed on disk, and they map 1:1 in meaning to the 4 `document_categories` rows already seeded by `0004_seed_lookups.sql` (whose own `name_th` uses shorter text, e.g. "หมวดที่ 1 โครงสร้างอาคาร" vs. the folder's "หมวดที่ 1 โครงสร้างอาคารและสถาปัตยกรรม (Civil & Structural)"). Matching by explicit lookup table (not fuzzy/substring matching) avoids ever mis-routing a document into the wrong category due to a coincidental text overlap. A top-level folder not present in the table is skipped with a warning (FR-002, spec Edge Cases).

**Alternatives considered**: Matching by a shared numeric prefix ("หมวดที่ 1" → sort_order 1) — rejected as more fragile (relies on formatting/whitespace around the number) for no real benefit over 4 hard-coded strings.

## Decision 2: Sub-folder → `documents.note`

**Decision**: For each file, find its path relative to the matched category root. If the file sits inside exactly one or more levels of sub-folder, the **immediate** sub-folder name (the first path segment under the category root) becomes `note`. If the file sits directly in the category root, `note` is `null`.

**Rationale**: The schema has no sub-category column (confirmed: `documents` is `id, category_id, storage_path, file_name, note, created_at, updated_at`), and the spec (FR-004) requires the sub-folder context to remain visible somewhere. `note` is the only free-text field available and is already rendered in the existing `DocList` component. Using only the *immediate* sub-folder (not the full relative path) matches Feature 014's Decision 3 precedent ("an extra descriptive sub-folder... carries no separate meaning; every file underneath still belongs to the [top-level match]") — confirmed unnecessary in practice anyway, since a disk inspection of the current tree shows every file sits at exactly one sub-folder level deep (`category-root/sub-folder/file`), never deeper and never a mix of levels within the same sub-folder.

**Alternatives considered**: Storing the full relative path (e.g. "1.2 งานผนังและกำแพงกันไฟ (Firewalls)/some/deeper/path") — rejected as overkill for a field that's meant to be a short human-readable hint, not a breadcrumb; nothing on disk today needs more than one level anyway.

## Decision 3: Duplicate detection key

**Decision**: A document counts as "already imported" if there's an existing row with the same `category_id`, the same `note` (including both being `null`), and the same `file_name`.

**Rationale**: Directly implements FR-006 and the spec's edge case about two different sub-folders legitimately containing same-named files ("quotation.pdf" in two different sub-folders must both import, not be treated as duplicates of each other). Matching on `note` in addition to `file_name` is what makes that distinction possible — matching on `file_name` alone (Feature 014's approach for photos, where the equivalent scope key was `week_id`) would have collapsed those two legitimately-different documents into one.

**Alternatives considered**: Content hash/checksum comparison — rejected per spec Assumptions ("does not need to compare file contents/checksums to detect a renamed or moved duplicate"); out of scope, adds real complexity (reading and hashing every file on every run) for a need the account holder didn't express.

## Decision 4: Storage key sanitization

**Decision**: Reuse the exact `sanitizeForStorageKey()` function from `import-weekly-photos.ts` (strips non-ASCII characters from the storage key's filename portion only; the original `file_name` shown in the app is untouched).

**Rationale**: Supabase Storage rejects non-ASCII object keys outright — already confirmed live in Feature 014 ("Invalid key" failures on Thai-named files). The exact same problem exists here: most of the source file names are in Thai (e.g. "แปลนห้องที่3.pdf", "ใบเสนอราคางานติดตั้งระบบพื้น บริษัทเน็กซ์เจน.pdf"). No need to re-derive this fix — copy the already-proven function rather than importing it across scripts (Feature 014's script isn't a shared module, it's a one-off; duplicating ~5 lines is simpler and safer than introducing a new shared `lib/` export for two call sites).

**Alternatives considered**: URL-encoding the filename instead of stripping — rejected, `sanitizeForStorageKey`'s strip-based approach is already proven against Supabase Storage's actual (undocumented) key constraints; encoding is an unverified alternative for no benefit.

## Decision 5: Accepted file types

**Decision**: Validate every file against `lib/validation.ts`'s existing `DOCUMENT_MIME_TYPES` (PDF, images, video, `.docx`, `.xlsx`) and `MAX_FILE_SIZE_BYTES`, via the existing `validateFile()` helper — the same allowlist the live `uploadDoc` Server Action enforces.

**Rationale**: Constitution VIII requires one single source of truth for upload validation; an imported document must never be something the browser's own upload control would have rejected. All file extensions observed on disk today (`.pdf`, `.jpg`, `.JPG`) are already covered by this allowlist, so no gap exists in practice.

**Alternatives considered**: A looser allowlist just for this script (e.g. also accepting `.doc`/`.xls` legacy formats) — rejected; none of the real files need it, and it would create an inconsistency where an imported document's type couldn't have been uploaded through the UI.
