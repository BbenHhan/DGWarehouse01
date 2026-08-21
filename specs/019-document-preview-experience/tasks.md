---

description: "Task list for Document Preview Experience"

---

# Tasks: Document Preview Experience

**Input**: Design documents from `/specs/019-document-preview-experience/`

**Status**: Retroactively documented — all tasks below were already implemented and verified (tsc/lint clean, dev-server compile clean) before this document was written, per the account holder's explicit request to formalize completed work.

## Phase 1: Foundational

- [X] T001 [P] Create `components/ui/collapsible.tsx` — shadcn-style wrapper over `@base-ui/react/collapsible` (`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`)

## Phase 2: User Story 1 - Group by sub-folder (Priority: P1)

- [X] T002 [US1] In `DocList.tsx`, implement `groupIndexByNote`-based grouping: documents with a `note` grouped into `{ note, docs }[]`; documents without one collected separately as `ungrouped`
- [X] T003 [US1] Render `ungrouped` documents directly; render each group as a `Collapsible` with a trigger showing note + file count and a rotating chevron

## Phase 3: User Story 2 - Inline preview, never a popup (Priority: P1)

- [X] T004 [US2] Extract `DocumentRow` from the old flat-link-per-row markup into a `Collapsible`-based row: header stays a trigger (icon, filename, extension, chevron), panel renders `DocumentPreview`
- [X] T005 [US2] Implement `DocumentPreview`: branches on `fileKindFromName` — image via `next/image`, video via `<video controls>`, pdf via `<iframe>` sized `h-[85vh]`, other via a centered fallback message
  **Deviation found live**: an initial `#view=FitH` URL fragment hint (intended to force the PDF viewer to fit-width) was tried and then removed after live testing showed it made the effective zoom worse, not better, on a large-format architectural-drawing PDF — the fix that actually helped was simply maximizing the iframe's height (`h-96` → `h-[85vh]`), not fighting the browser's own auto-zoom heuristic.

## Phase 4: User Story 3 - Drive-style actions (Priority: P2)

- [X] T006 [US3] Implement `downloadFile(src, fileName)`: fetch the file as a blob client-side, create an object URL, trigger a synthetic `<a download>` click, revoke the object URL — necessary because the plain `download` attribute is ignored for cross-origin URLs (Supabase Storage is a different origin than the app)
- [X] T007 [US3] Implement `shareFile(src, fileName)`: `navigator.share` when available, else `navigator.clipboard.writeText` with a success toast
- [X] T008 [US3] Implement `DocumentActions` bar (download / open-in-new-tab / share buttons) rendered above every open preview
  **Deviation found live**: the "open in new tab" button uses Base UI's `Button` with `render={<a>...}` to render as a real `<a>` tag; this required explicitly passing `nativeButton={false}`, since Base UI's `Button` otherwise assumes and warns if it isn't rendering an actual `<button>` element.

## Phase 5: Polish

- [X] T009 [P] Run `npx tsc --noEmit` — clean
- [X] T010 [P] Run `npx next lint` — clean
- [X] T011 Dev-server live compile check of `/documents/[categorySlug]` — 200 OK, no server errors (full authenticated click-through still blocked on account-holder sign-in, standing limitation)

## Summary

11/11 tasks complete except the always-pending live-authenticated-click-through step, which every feature this session has deferred to the account holder for the same reason (this agent cannot sign in).
