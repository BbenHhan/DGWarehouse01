# Implementation Plan: Document Upload Categorization

**Branch**: `main` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

## Summary

`DocUploader.tsx` gains two optional controls above its existing file picker: a category `<Select>` (populated from all `document_categories`, defaulting to the page's own category) and a group/sub-folder text `<Input>` backed by a `<datalist>` of previously-used note values (fetched once, sitewide, via a new `getDocumentNotes()`). `uploadDoc` (Server Action) and its `localSaveDocumentFile` counterpart both gain a `note` parameter, threaded through to the `documents` insert exactly like Feature 017's import script already does.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.

**Primary Dependencies**: None new — reuses `components/ui/select.tsx` (already used elsewhere, e.g. `EditModal.tsx`'s move-to picker) and a plain native `<input list="...">`/`<datalist>` pair (no new UI library needed for autocomplete-with-free-text; this is a standard HTML pattern already sufficient for the "suggest existing, allow new" requirement).

**Storage**: No schema change — `documents.category_id`/`note` already exist. Storage path convention unchanged (`${categoryId}/${randomUUID()}-${fileName}`).

**Testing**: No new Vitest coverage — this is UI wiring plus a Server Action parameter addition, not new pure logic; verified via `tsc`/`lint`/dev-server compile, consistent with how Features 019/021 (similarly UI-shaped) were verified.

**Constraints**: Must not change existing behavior when the new fields are left at their defaults (spec FR-003) — a no-op upload with category unchanged and note blank must behave identically to before this feature.

## Constitution Check

- **II. Server Actions & Supabase Client Boundary**: ✅ `uploadDoc` remains the sole mutation path; only its parameter list grows.
- **VIII. Universal File Attachments**: ✅ No change to MIME/size validation — `note`/`categoryId` are metadata alongside the same `validateFile` call already in place.
- Everything else: N/A.

No violations.

## Project Structure

```text
lib/
├── validation.ts       # MODIFIED — uploadDocSchema gains optional note
├── data.ts              # MODIFIED — new getDocumentNotes(): Promise<string[]>
├── local/store.ts        # MODIFIED — localSaveDocumentFile gains note param; new localGetDocumentNotes()
└── mock/source.ts        # MODIFIED — new mockGetDocumentNotes() (returns [] — mock documents never have notes)

app/actions/documents.ts  # MODIFIED — uploadDoc(categoryId, note, files) instead of uploadDoc(categoryId, files)
app/(app)/documents/[categorySlug]/page.tsx   # MODIFIED — fetches getDocumentNotes(), passes categories + existingNotes to DocUploader
components/DocUploader.tsx                     # MODIFIED — category Select + note input/datalist added
```

**Structure Decision**: In-place extension of the existing document-upload path across all three `DATA_SOURCE` backends, matching Constitution III's same-contract requirement.
