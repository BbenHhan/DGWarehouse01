---

description: "Task list for Document Upload Categorization"

---

# Tasks: Document Upload Categorization

**Input**: Design documents from `/specs/025-document-upload-categorization/`

## Phase 1: Foundational

- [X] T001 [P] Update `lib/validation.ts`: `uploadDocSchema` gains optional `note: z.string().optional()`
- [X] T002 [P] Update `lib/local/store.ts`: `localSaveDocumentFile(categoryId, note, file)` (was `(categoryId, file)`) sets `note: note ?? null` on the created row; add `localGetDocumentNotes(): Promise<string[]>` (distinct non-null notes across all documents)
- [X] T003 [P] Update `lib/mock/source.ts`: add `mockGetDocumentNotes(): Promise<string[]>` returning `[]` (mock documents never have notes)
- [X] T004 Update `lib/data.ts`: add `getDocumentNotes(): Promise<string[]>` branching by `DATA_SOURCE` (mock/local/supabase — supabase branch: `documents.select("note")`, dedupe non-null in JS)

## Phase 2: User Story 1 - Choose category at upload time (Priority: P1)

- [X] T005 [US1] Update `app/actions/documents.ts`'s `uploadDoc`: signature becomes `(categoryId, note, files)`; pass `note` through to both the `local` branch's `localSaveDocumentFile` call and the `supabase` branch's `.insert({ ..., note })`
- [X] T006 [US1] Update `app/(app)/documents/[categorySlug]/page.tsx`: pass the already-fetched `categories` list and a newly-fetched `getDocumentNotes()` result to `DocUploader`
- [X] T007 [US1] Update `components/DocUploader.tsx`: add a category `<Select>` (via `components/ui/select.tsx`) defaulting to the page's `categoryId` prop, local state `selectedCategoryId`

## Phase 3: User Story 2 - Group at upload time (Priority: P1)

- [X] T008 [US2] In `DocUploader.tsx`, add a note `<Input list="doc-upload-note-suggestions">` + `<datalist id="doc-upload-note-suggestions">` populated from the `existingNotes` prop, local state `noteValue`
- [X] T009 [US2] Wire `handleFiles` to call `uploadDoc(selectedCategoryId, noteValue.trim() || null, files)` instead of the old `uploadDoc(categoryId, files)`

## Phase 4: Polish

- [X] T010 [P] Run `npx tsc --noEmit`
- [X] T011 [P] Run `npx next lint`
- [X] T012 [P] Run `npm test` (no new tests expected to be added/broken)
- [X] T013 Dev-server compile check of `/documents/[categorySlug]`
