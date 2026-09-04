# Contract: Taxonomy Server Actions

**Feature**: [../spec.md](../spec.md) · **Date**: 2026-08-25

The app exposes no HTTP API — Server Actions are its interface (Constitution II), so this
is the contract surface. New actions live in `app/actions/document-taxonomy.ts`; the two
document changes extend `app/actions/documents.ts`.

Every action returns the project's existing `ActionResult<T>` discriminated union, so call
sites render success and failure without a try/catch across the boundary.

## Shared rules

- **Role gate**: every action calls `requireRole("editor")` first and returns
  `{ ok: false, error }` on failure. Not `"admin"` — see FR-015 and FR-017a.
- **Validation**: Zod schemas in `lib/validation.ts`, following the checklist schemas'
  shape. Blank and duplicate-sibling names are rejected there (FR-012).
- **Revalidation**: every mutation revalidates `/documents` and
  `/documents/[categorySlug]`.
- **Backends**: each action branches `local` / `supabase` exactly as the checklist actions
  do; `mock` rejects with a message rather than silently succeeding.

## Categories

| Action | Input | Success | Notable failures |
|---|---|---|---|
| `createCategory` | `{ nameTh, emoji }` | the new `DocumentCategory`, appended last | blank name; duplicate name |
| `renameCategory` | `{ id, nameTh?, emoji? }` | updated category | blank name; nothing to change; **slug is not accepted as input at all** (FR-013) |
| `moveCategory` | `{ id, direction: "up" \| "down" }` | the reordered list | already first / already last |
| `deleteCategory` | `{ id, documents: DocumentDisposition }` | `{ id }` | see disposition rules below |

`createCategory` generates `slug` as `category-N` (research Decision 4). The caller never
supplies one, and no action accepts a slug change.

## Groups

| Action | Input | Success | Notable failures |
|---|---|---|---|
| `createGroup` | `{ categoryId, nameTh }` | the new `DocumentGroup`, appended last within its category | blank name; name already used in that category |
| `renameGroup` | `{ id, nameTh }` | updated group | blank name; name already used in that category |
| `moveGroup` | `{ id, direction: "up" \| "down" }` | the reordered list for that category | already first / already last |
| `deleteGroup` | `{ id, documents: DocumentDisposition }` | `{ id }` | see disposition rules below |

## DocumentDisposition

The deletion contract that makes FR-011 unbypassable. Deleting anything that holds
documents MUST carry an explicit decision — there is no default:

```text
DocumentDisposition =
  | { kind: "none" }                                   // asserts the target holds no documents
  | { kind: "move"; toCategoryId; toGroupId: string | null }
  | { kind: "delete"; confirmedCount: number }
```

Rules the server enforces, not the UI:

- `kind: "none"` with documents present → refused, error names the real count.
- `kind: "move"` → destination must exist and must not be inside the subtree being
  deleted (spec Edge Cases). Documents are re-parented, then the structure is removed.
- `kind: "delete"` → `confirmedCount` must equal the server's own count at the moment of
  the call. A mismatch means the count the user confirmed is stale (someone uploaded in
  the meantime) and the action is refused rather than destroying an unexpected number of
  files. This is what makes FR-011a's "names the number to be destroyed" a guarantee
  rather than a label.
- Any refusal changes nothing at all — no partial delete, no partial move (FR-011b).

Deleting the files also deletes their stored objects; deleting the rows alone would leave
them orphaned in Storage forever.

## Document moves (extending existing actions)

| Action | Change |
|---|---|
| `editDoc` | input gains `groupId?: string \| null`. `null` means "no sub-group". `editDocSchema` gains the field and keeps its "at least one field" rule. The `note` field is removed from the schema along with the column. |

`moveDocuments({ documentIds, toCategoryId, toGroupId })` is the bulk form the disposition
uses internally. Whether it is also exposed to the UI is a `/speckit-tasks` question — the
per-document control in `DocList` is enough for US6's acceptance scenarios.

Moving is metadata only: `storage_path` is never rewritten (research Decision 5).

## Read model

| Function | Change |
|---|---|
| `getDocumentCategories()` | unchanged — already ordered by `sort_order` |
| `getDocumentGroups(categoryId)` | **new** — that category's groups in `sort_order`, each with its document count |
| `getDocumentNotes()` | **removed.** Its two faults were the feature's trigger: it could only return names some document already carried, and it drew from every category at once. `getDocumentGroups(categoryId)` replaces it and fixes both (FR-023). |
| `getDocuments(categoryId)` | returns `group_id` in place of `note` |

## Upload form

`uploadDoc` keeps accepting a freely typed group name (FR-024). A name that matches an
existing group in that category attaches to it; one that does not creates the group first,
then attaches. It is the same code path `createGroup` uses, so a group born this way is
indistinguishable from one created in management mode.
