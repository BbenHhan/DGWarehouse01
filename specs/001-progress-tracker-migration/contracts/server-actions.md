# Contracts: Server Actions

This app has no separate REST/GraphQL API — per constitution Principle II, all
mutations are Next.js Server Actions. This document is the contract between UI
components and those actions: inputs, outputs, and error shape. Types reference
`lib/types.ts`.

Every action returns a discriminated result so call sites can render loading vs.
success vs. error state (constitution Principle V) without throwing across the
Server/Client boundary:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

## `app/actions/photos.ts`

### `uploadPhoto(input: UploadPhotoInput): Promise<ActionResult<UploadPhotoOutput>>`

```ts
type UploadPhotoInput = {
  weekId: string
  files: File[]        // 1..20 files, submitted via FormData
}

type UploadPhotoOutput = {
  results: Array<
    | { fileName: string; success: true; photo: Photo }
    | { fileName: string; success: false; error: string }
  >
}
```

- Rejects (per-file) any file over 25 MB or not JPEG/PNG/HEIC (FR-018).
- Succeeds overall (`ok: true`) even if some individual files fail — per-file
  outcome is in `results` (US3 acceptance scenario 2, FR-005).
- Uploads to Storage bucket `photos` at `{weekId}/{uuid}-{filename}`, then
  inserts one `photos` row per successful file.

### `deletePhoto(input: { photoId: string }): Promise<ActionResult<{ photoId: string }>>`

- Deletes the Storage object and the `photos` row.
- Client MUST remove the item from view optimistically before calling this
  action, then roll back only if `ok: false` (FR-011, constitution Principle V).

### `editPhoto(input: EditPhotoInput): Promise<ActionResult<Photo>>`

```ts
type EditPhotoInput = {
  photoId: string
  fileName?: string   // rename; rejected if empty string
  note?: string        // add/edit description
  weekId?: string       // move to a different week (any room/work-type)
}
```

- At least one of `fileName`, `note`, `weekId` MUST be present.
- `fileName`, if provided, MUST be non-empty after trimming (edge case in spec).

## `app/actions/documents.ts`

### `uploadDoc(input: UploadDocInput): Promise<ActionResult<UploadDocOutput>>`

```ts
type UploadDocInput = {
  categoryId: string
  files: File[]        // 1..20 files
}

type UploadDocOutput = {
  results: Array<
    | { fileName: string; success: true; document: Document }
    | { fileName: string; success: false; error: string }
  >
}
```

- Rejects (per-file) any file over 25 MB or not PDF/DOCX/XLSX (FR-018).
- Uploads to Storage bucket `documents` at `{categoryId}/{uuid}-{filename}`, then
  inserts one `documents` row per successful file.

### `deleteDoc(input: { documentId: string }): Promise<ActionResult<{ documentId: string }>>`

- Same optimistic-delete contract as `deletePhoto`.

### `editDoc(input: EditDocInput): Promise<ActionResult<Document>>`

```ts
type EditDocInput = {
  documentId: string
  fileName?: string
  note?: string
  categoryId?: string   // move to a different หมวด
}
```

- Same validation rules as `editPhoto`, scoped to `categoryId` instead of `weekId`.

## Shared validation (`lib/validation.ts`)

All six actions validate their input with a Zod schema before touching Supabase;
a failed parse returns `{ ok: false, error: <human-readable message> }` rather
than throwing, so every call site can rely on the same `ActionResult` shape.
