# Research: Editable Document Taxonomy

**Feature**: [spec.md](spec.md) · **Date**: 2026-08-25

## Decision 1 — Sub-groups become a table, and `documents.note` goes away

**Decision**: Add `document_groups (id, category_id, name_th, sort_order)` and replace
`documents.note` with `documents.group_id` referencing it. `note` is dropped, not kept
alongside.

**Rationale**: Every requirement in the spec is blocked by the same thing — a sub-group
today is a string copied onto each document, so it has no identity, no order, and no
existence without a file. A table gives all three at once. Dropping `note` rather than
keeping both matters: two writable copies of a name is exactly the drift the feature
exists to remove, and the upload form's free-text entry (FR-024) would otherwise be
able to create a `note` that no group row knows about.

**Alternatives considered**:

- *Keep `note`, add a side table for order only.* Smaller migration, but renaming still
  means rewriting every matching document row, and the side table and the documents can
  disagree about which names exist. Rejected: it leaves two of the three problems.
- *A fixed list in code.* Trivial, and precisely what the account holder asked not to
  have — a new topic would need a developer and a deploy. Rejected on the spec's premise.

## Decision 2 — Backfill order comes from the names themselves

**Decision**: When the migration creates a group row per distinct `(category_id, note)`,
`sort_order` is assigned by sorting those names as text.

**Rationale**: The live names are already numbered by hand — `0. แปลนและแบบก่อสร้าง`,
`1.1 งานพื้นอาคาร`, `1.2 …`, `1.3 …`, `1.4 …`, `2.1 …`, `3.1 …`. A text sort reproduces
the intended reading order exactly. There is no other ordering signal available:
today's display order is whichever document was encountered first, which is not an
order anyone chose, and `created_at` reflects upload time, not sequence.

**Alternatives considered**:

- *Order by each group's earliest document.* Reproduces the accidental order the feature
  is meant to fix. Rejected.
- *Leave them all at 0 and let an editor sort it out.* Makes the first run of the feature
  a chore and briefly shows an arbitrary order to everyone. Rejected — the correct order
  is derivable, so derive it.

The prefixes are a naming habit, not a rule, so a text sort is only correct for today's
data. New groups sort by explicit `sort_order` from creation onward; this decision is
about the one-time backfill only.

## Decision 3 — Dense renumbering on every move

**Decision**: Moving a row swaps its `sort_order` with its neighbour and renumbers the
affected parent's rows to a contiguous 1..n in one statement.

**Rationale**: The lists are tiny — four categories, at most a handful of groups each.
Sparse gaps (10, 20, 30) exist to avoid rewriting many rows on reorder; rewriting five
integers is free. Contiguous ordering is also easier to reason about when reading the
table by hand.

**Alternatives considered**: sparse gaps with periodic compaction, fractional ranks
between neighbours. Both solve a scale problem this data does not have.

## Decision 4 — A new category's address is `category-N`

**Decision**: Generate `slug` as `category-<n>`, where n is the smallest positive integer
that is not already taken. Existing slugs (`structure`, `electrical`, `environment`,
`safety`) are never regenerated or changed.

**Rationale**: FR-013/FR-014 — the slug is only a URL segment, and Thai names do not
slugify into anything usable. Existing slugs are live URLs, so they are immutable.
A predictable readable form beats a random one for anyone reading logs or the table.

**Alternatives considered**: a random suffix (unique without a lookup, but unreadable);
asking the editor to type one (FR-014 exists to avoid exactly that).

## Decision 5 — Moving a document never touches storage

**Decision**: Changing a document's group or category updates database columns only. The
stored file is not copied, moved, or re-keyed.

**Rationale**: The storage key is `${categoryId}/${uuid}-${name}` and the row keeps
`storage_path` verbatim, so the file keeps resolving from wherever it already lives. A
category move today already behaves this way. Re-keying would mean a copy-and-delete per
file with no benefit and a real risk of losing one part-way — unacceptable under FR-011
where the whole point is that no document is lost.

**Consequence worth stating**: a document moved between categories keeps a storage key
whose leading segment names its *original* category. That is already true in production
today; this feature does not make it worse and does not attempt to fix it.

## Decision 6 — Two dialogs, and only when documents are involved

**Decision**: Deleting something empty asks once. Deleting something holding documents
opens a dialog offering *move* or *delete*, and choosing *delete* opens a second dialog
naming the document count before anything happens.

**Rationale**: Directly from the clarification session (FR-011, FR-011a). The
asymmetry is deliberate: the second dialog exists to make destroying files hard, so
it appears only when files are at stake — putting it in front of an empty group would
train people to click through it.

**Move destination**: any category, and any group inside it, drawn live so a
just-created group is selectable. The subtree being deleted is excluded from its own
destination list (spec Edge Cases) — moving a category's documents into that same
category's group would destroy them a second later.

## Decision 7 — Optimistic writes, with reordering debounced

**Decision**: Each change writes as it is made, the list updates ahead of confirmation,
and a failure reverts the row and raises a toast — the pattern `ChecklistList` and
`RoomChecklistBox` already use. Reorder clicks within a short window collapse into one
write.

**Rationale**: Constitution V requires an explicit loading and error state per async
action, and the checklist established the house pattern for exactly this shape of edit.
Debouncing reorder is what keeps "tap up four times quickly" from issuing four writes
that can land out of order — the settled order must match what is on screen (spec Edge
Cases).

## Decision 8 — Unsent text survives the mode toggle by living above it

**Decision**: The add-field values are held in state owned by the component that stays
mounted across the mode switch, keyed by category, rather than inside the management
panel that unmounts.

**Rationale**: FR-025 asks only that a mis-click not lose typing. Lifting the state is
enough and costs nothing; it deliberately does not survive a reload, which would mean
persisting drafts nobody asked for.

## Decision 9 — Backend coverage follows the checklist's precedent

**Decision**: `supabase` gets the full implementation; `local` gets an equivalent one
(the test suite runs against it); `mock` reports an empty group list and exposes no
management, mirroring `mockGetChecklistItems`.

**Rationale**: Constitution III requires the local backend to be a drop-in with the same
contract, and the test suite depends on it. `mock` is a frozen read-only snapshot of a
folder tree that has no concept of a taxonomy.

## Decision 10 — Moving gets a real destination picker, and it is editor-level

**Decision**: `editDoc` gains a `groupId`, and the per-document move control is extended
from a flat category list to category + group. The role gate stays `requireRole("editor")`
for every action in this feature — taxonomy management included.

**Rationale**: FR-026 needs a destination that can name a group; today's control cannot.
FR-015/FR-017a settle the role: Constitution VII gives the admin role exactly one power
the editor role lacks — changing an account's role — so gating the taxonomy behind admin
would silently add a second one. The feature was first briefed as admin-only and the
account holder overturned that during clarification.
