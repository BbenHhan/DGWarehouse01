# Contract: Server Actions — `app/actions/group-requirements.ts`

All actions return `ActionResult<T>` (`{ ok: true, data } | { ok: false, error }`), never
throw to the client, and share these rules:

1. **Rights first.** `requireRole("editor")` before parsing or reading anything.
   - Not signed in → `กรุณาเข้าสู่ระบบก่อนทำรายการนี้`
   - Signed in without edit rights → `คุณไม่มีสิทธิ์ทำรายการนี้`
   - A refused call changes nothing (FR-013).
2. **Validation second.** Zod schemas in `lib/validation.ts`; the first issue's Thai
   message is returned.
3. **Backend split.** `mock` → `โหมดตัวอย่างแก้ไขข้อมูลไม่ได้`. `local` → `lib/local/store.ts`.
   `supabase` → service-role client.
4. **Not yet migrated.** A Supabase "table/column missing" error →
   `ยังไม่ได้เปิดใช้รายการเอกสารที่ต้องมี (ต้องรัน migration 0015 ก่อน)`.
5. **Revalidation.** On success, revalidate `/documents` and `/documents/[categorySlug]`.

| Action | Input | Success data | Specific failures |
|---|---|---|---|
| `addRequirement` | `{ groupId: uuid, nameTh: string, status?: RequirementStatus, note?: string \| null }` | `GroupRequirement` (appended last; status defaults `missing`) | blank name → `กรุณาระบุชื่อรายการ`; group not found → `ไม่พบหมวดย่อยนี้` |
| `updateRequirement` | `{ id: uuid, nameTh?: string, status?: RequirementStatus, note?: string \| null }` — at least one field | `GroupRequirement` | none given → `ไม่มีข้อมูลที่จะแก้ไข`; blank name → `กรุณาระบุชื่อรายการ`; not found → `ไม่พบรายการนี้` |
| `deleteRequirement` | `{ id: uuid }` | `{ id }` | not found → `ไม่พบรายการนี้` |
| `moveRequirement` | `{ id: uuid, direction: "up" \| "down" }` | `GroupRequirement[]` (the sub-group's items, renumbered 1..n) | first item up / last item down → `ย้ายต่อไม่ได้แล้ว`; not found → `ไม่พบรายการนี้` |
| `setGroupDescription` | `{ groupId: uuid, description: string \| null }` | `{ id, description }` | not found → `ไม่พบหมวดย่อยนี้` |
| `setCategoryDescription` | `{ categoryId: string, description: string \| null }` | `{ id, description }` | not found → `ไม่พบหมวดนี้` |

**Normalization** (FR-012): `nameTh` trimmed, must be non-empty, ≤ 300. `note` and
`description` trimmed; empty after trimming → `null`; note ≤ 500, description ≤ 300.

**Ordering**: `moveRequirement` swaps with the neighbour then renumbers the sub-group's
items to a contiguous 1..n, the same way `moveGroup` does. `deleteRequirement` renumbers
the remainder.

## Read — `lib/data.ts`

`getGroupRequirements(categoryId: string): Promise<Record<string, GroupRequirement[]>>`

- `mock` → `{}`. `local` → from `db.json`. `supabase` → items whose sub-group belongs to
  the category, sorted by `sort_order`.
- Table missing → `{}` (research Decision 4). Any other error → thrown.
- Requires a signed-in user, like every other read.

## UI contract

- **Viewer / browse mode** — `GroupRequirements` under each sub-group header, outside the
  collapse trigger: description (if any), then items. Each item: status icon + Thai label,
  name, note. No counts (FR-006). Renders nothing when there is neither description nor
  items (FR-007).
- **Editor / management mode** — `GroupRequirementsEditor`: editable description; per
  item a three-way status control (`aria-pressed`), editable name, editable note, reorder
  buttons, delete; an add form at the end. Status change and delete are optimistic with
  rollback + toast on failure (FR-014, Constitution V).
- **Category** — description under the header in browse mode; editable per category in
  `CategoryManagePanel`.
