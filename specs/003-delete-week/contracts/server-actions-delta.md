# Server Actions Contract Delta: `deleteWeek` (new)

This documents a *new* Server Action added to `app/actions/photos.ts`, alongside
the existing `uploadPhoto`, `deletePhoto`, `editPhoto`, `createWeek` (unchanged by
this feature).

## New action

```ts
deleteWeek(weekId: string): Promise<ActionResult<{ weekId: string }>>
```

**Behavior**:
- "local" backend: `localDeleteWeek(weekId)` (new function in `lib/local/store.ts`)
  — deletes every `Photo` row with that `week_id` (and its underlying file on
  disk, reusing the existing per-file deletion helper), then deletes the `Week`
  row. Returns the removed week, or `null` if no week matched `weekId`.
- "supabase" backend (not live): fetches the week's photos, removes their Storage
  objects (`supabase.storage.from("photos").remove([...])`), then deletes the
  `weeks` row — the existing `on delete cascade` FK on `photos.week_id` removes
  the photo rows automatically once the week row is deleted.

**Error responses** (`ActionResult<{ weekId: string }>` with `ok: false`):
- Week not found → `"ไม่พบสัปดาห์นี้"` (matches the existing "not found" phrasing
  pattern used by `deletePhoto`'s `"ไม่พบรูปภาพนี้"`).

**Success**: `{ ok: true, data: { weekId } }`, followed by the same
`revalidatePath("/photos/[roomSlug]/[workTypeSlug]", "page")` call already used by
every other mutation in this file.

## Caller (new)

`components/DeleteWeekButton.tsx` (new client component) — renders a trash-icon
`Button` wrapped in the existing shadcn/ui `AlertDialog` pattern (same primitive
`PhotoGrid`/`DocList` already use for delete confirmation), takes `weekId` and
`photoCount` as props so its confirmation copy can branch on whether the week has
files (research.md Decision 3). Rendered inside `WorkTypeWeekNav`'s week card,
gated by `!USE_MOCK_DATA` (matching every other mutation control).
