# Quickstart: Download a Category as One ZIP

## Prerequisites

- Dev server running; signed in (the download needs a session).

## Automated checks

```bash
npx vitest run lib/zip.test.ts lib/document-archive.test.ts "app/api/documents/[categorySlug]/zip/route.test.ts"
```

Covers: archives round-trip through a real central-directory read; UTF-8 name flag; empty folders; the size guard; duplicate names including the "ก (2).pdf" collision; a missing stored file; and the route's 401, 404, headers and real archive body.

## Scenario 1 — The bundle (US1)

Open หมวด 6 and tap **ดาวน์โหลด ZIP**.

- The browser saves `หมวดที่ 6 ยื่นขออนุญาตระบบความปลอดภัยอาคาร (ตาม checklist).zip`.
- Extract on macOS **and** on Windows: every Thai folder and file name reads correctly.
- Folders match the page: same sub-groups, same order, same numbers; empty sub-groups are empty folders; the files inside open and match what the app shows.

## Scenario 2 — Nothing is lost (US2)

In a scratch sub-group, upload `ก.pdf`, then `ก (3).pdf`, then a second `ก.pdf`, and download.

- Three distinct files come out, each with its own contents.

## Scenario 3 — The boundary (US3)

- Sign out and request `/api/documents/checklist-permit/zip`: a Thai message, no file.
- Request `/api/documents/does-not-exist/zip` while signed in: a Thai not-found message.
