# Data Model: Sub-group Requirement Checklist

## Changed: `document_categories`

| Field | Type | Rules |
|---|---|---|
| `description` | text, nullable | New. Trimmed; empty or whitespace stored as null (FR-012). |

## Changed: `document_groups`

| Field | Type | Rules |
|---|---|---|
| `description` | text, nullable | New. Same rules as above. |

## New: `document_group_requirements`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, pk | `gen_random_uuid()` |
| `group_id` | uuid, not null | References `document_groups(id)` **on delete cascade** (FR-015). Indexed. |
| `name_th` | text, not null | Trimmed, non-blank (check constraint + validation), ≤ 300 chars. |
| `status` | text, not null, default `'missing'` | Check: `have`, `missing`, `waiting` (FR-003, FR-009). |
| `note` | text, nullable | Trimmed; whitespace-only stored as null; ≤ 500 chars. |
| `sort_order` | integer, not null | Contiguous 1..n within `group_id`; new items append. |
| `created_at` | timestamptz, not null | default `now()` |
| `updated_at` | timestamptz, not null | default `now()`; set on every update |

- No uniqueness on `(group_id, name_th)`: two items may legitimately share wording (e.g.
  "รูปถ่ายหน้างาน" under different checks), unlike sub-group names.
- RLS: the same `authenticated` full-access policy every other table uses; authorization
  is enforced in the Server Actions (Constitution VII).

### Status

```text
missing ⇄ have ⇄ waiting ⇄ missing     (any state to any state, set by an editor)
```

No transitions are automatic (research Decision 3).

## TypeScript shapes (`lib/types.ts`)

```ts
export type RequirementStatus = "have" | "missing" | "waiting";

export type GroupRequirement = {
  id: string;
  group_id: string;
  name_th: string;
  status: RequirementStatus;
  note: string | null;
  sort_order: number;
};

// DocumentCategory and DocumentGroup each gain:
description?: string | null;
```

`getGroupRequirements(categoryId)` returns `Record<string, GroupRequirement[]>` keyed by
group id, each list sorted by `sort_order`. Sub-groups with no items are absent from the
record.

## Local backend (`db.json`)

- `LocalDb` gains `groupRequirements: GroupRequirement[]`, defaulted to `[]` when an older
  file lacks it.
- `documentCategories[]` and `documentGroups[]` entries may carry `description`.
- Deleting a sub-group removes its requirements; deleting a category removes the
  requirements of every sub-group it held (the cascade, by hand).

## Seed (migration only)

Source of truth: the spec's *Appendix: Initial content for หมวด 6*.

- Category `checklist-permit`: description set if currently null.
- For each appendix sub-group matched by name within `checklist-permit`:
  - description set if currently null;
  - items inserted in appendix order with `sort_order` 1..n **only if** the sub-group has
    no requirement rows yet.
- Sub-groups whose names are not found: skipped.
