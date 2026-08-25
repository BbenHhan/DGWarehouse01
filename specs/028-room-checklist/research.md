# Research: Room Checklist

## Decision 1: Room tagging is a real many-to-many junction table, not an array column

**Decision**: A `checklist_item_rooms` junction table (`checklist_item_id`, `room_id`, composite PK), not a `room_ids uuid[]` array column on `checklist_items`.

**Rationale**: The room-page checklist box needs to efficiently query "every not-done item tagged to room X" — a junction table lets Postgres/PostgREST do this as a normal indexed join/filter (`checklist_item_rooms!inner(room_id)`), whereas an array column would need `@>`/`ANY` array-containment queries that are harder to express cleanly through PostgREST and don't index as naturally for this access pattern. A junction table is also the standard, most maintainable shape for a genuine many-to-many relationship (spec's "select or don't, and select many" requirement).

**Alternatives considered**: `room_ids uuid[]` array column — rejected for the querying reason above; also would need custom validation that every id in the array is a real room, whereas a real FK-backed junction table gets that for free from the database.

## Decision 2: Room-page checklist box supports add + toggle directly, not just display

**Decision**: `RoomChecklistBox` is a client component with its own quick-add input (auto-tags the current room) and toggle capability, not a read-only summary linking out to `/checklist`.

**Rationale**: The account holder's own stated motivation was explicitly "ตอนอยู่หน้างานจริง" (right at the job site) — the primary scenario is adding/resolving a task without leaving the room's page mid-inspection. A read-only box would defeat that purpose and just relocate the friction one click away.

## Decision 3: Mock backend returns an empty checklist, always

**Decision**: `mockGetChecklistItems()`/`mockGetRoomChecklistItems()` both return `[]` unconditionally.

**Rationale**: Consistent with every other feature added since the "mock" `DATA_SOURCE` became a frozen, read-only historical snapshot of the old v7 folder structure (Feature 025's `mockGetDocumentNotes` set this same precedent) — mock mode never had a checklist concept and isn't where real work happens.

## Decision 4: "Room" scope only, no work-type — confirmed against the room/work-type page's own routing

**Decision**: Checklist items tag `rooms` only; the room-page checklist box is scoped by `roomSlug` alone and shows on every work-type tab under that room unchanged.

**Rationale**: Directly matches the account holder's explicit wording ("แท็คได้ด้วยว่าของห้อง" — tag by room) and the physical reality of a DIW inspection walkthrough, which moves room-to-room, not work-type-to-work-type. Scoping to work-type as well would fragment one room's task list across up to 7 tabs for no benefit the account holder asked for.
