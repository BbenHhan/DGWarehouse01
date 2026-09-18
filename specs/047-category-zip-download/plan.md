# Implementation Plan: Download a Category as One ZIP

**Branch**: `feature/040-editable-document-taxonomy` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/047-category-zip-download/spec.md`

## Summary

Finish the uncommitted ZIP draft: keep its archive writer and folder layout, and close the four defects review found — a duplicate name that can still collide and lose a file, a >4 GB archive written in a form that cannot open, an untested route, and a response header that would throw on a non-ASCII slug. No new dependency, no new page.

## Technical Context

**Language/Version**: TypeScript / Next.js 15.5 (App Router), Node runtime.

**Primary Dependencies**: None. The draft writes ZIP itself over `node:zlib`'s raw deflate — chosen because the one thing every off-the-shelf writer got wrong here is the UTF-8 name flag Thai names need.

**Storage**: No schema change. Reads documents through the same `DATA_SOURCE` split as `lib/storage.ts`.

**Testing**: Vitest. `lib/zip.test.ts` already parses archives through the central directory rather than trusting the writer; extend it for the size guard, extend `lib/document-archive.test.ts` for the collision case, and add the route's first tests.

**Target Platform**: Vercel (Node runtime), archives extracted on Windows and macOS.

**Performance Goals**: One document in memory at a time; the largest category today is 137 MB across 37 files (measured 2026-09-17), the whole app 280 MB.

**Constraints**: Must not change the archive layout the draft already produces. Must fail loudly rather than emit an archive that cannot be opened.

**Scale/Scope**: 4 fixes, 1 new test file, 2 extended test files. Roughly 40 lines of production change.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- **I. App Router Only**: ✅ A route handler under `app/api/`, no Pages Router.
- **II. Server Actions & Supabase Client Boundary**: ✅ This is a read that must arrive as a file, which a Server Action cannot return; Principle II reserves Server Actions for *mutations*. It sits beside the existing `/api/local-file` and `/api/mock-file` read routes and uses the service-role client server-side only.
- **III. Storage-Agnostic Persistence**: ✅ `readDocumentBytes` splits on `DATA_SOURCE` exactly as `lib/storage.ts` does; no backend is hard-coded.
- **IV. Thai-First, Mobile-First**: ✅ Thai button and messages; the archive's names are Thai and flagged UTF-8 so they survive extraction.
- **V. Resilient Async UX**: ✅ The browser's own download UI reports progress for a file that can be hundreds of megabytes — better than any in-page spinner. Failures surface as a failed download rather than a silent truncation, which is what the size guard buys.
- **VI. Tailwind-Only Styling**: ✅ The button reuses the existing `Button` component.
- **VII. RBAC**: ✅ Signed-in only. Viewers may download because Constitution VII grants every role viewing of all documents, and the archive contains nothing the page does not already show.
- **VIII. Universal File Attachments**: ✅ Not engaged; this reads files rather than accepting them.

**Post-design re-check**: ✅ No violations. The size guard is a refusal, not a second code path.

## Project Structure

### Documentation (this feature)

```text
specs/047-category-zip-download/
├── spec.md
├── plan.md                   # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/download-route.md
├── checklists/requirements.md
└── tasks.md                  # /speckit-tasks
```

### Source Code (repository root)

```text
app/api/documents/[categorySlug]/zip/
├── route.ts                  # ASCII fallback name (fix 4)
└── route.test.ts             # new: auth, unknown category, headers, real archive

lib/
├── zip.ts                    # 4 GB / 65,535-entry guard (fix 2)
├── zip.test.ts               # extended for the guard
├── zip-test-helpers.ts       # new: the central-directory reader, shared by both test files
├── document-archive.ts       # collision-proof unique names (fix 1)
└── document-archive.test.ts  # extended for the collision case

app/(app)/documents/[categorySlug]/layout.tsx   # the button (already in the draft)
```

**Structure Decision**: Single Next.js project; the draft's file layout is kept as is.

## Complexity Tracking

No constitution violations to justify.
