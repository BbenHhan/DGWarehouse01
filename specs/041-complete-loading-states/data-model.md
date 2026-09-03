# Data Model: Complete Loading States

This feature stores nothing and changes no table, column, or stored file. It has no
entities in the persistence sense, and no migration accompanies it.

What it does introduce is transient view state, listed here so the tasks can be checked
against it.

## Transient state

| State | Lives in | Shape | Notes |
|---|---|---|---|
| in-flight row | list components that write per row | `string \| null` (the row's id) | FR-004; a bare boolean marks every row busy when one is written |
| indicator visible | `useDelayedBusy` | `boolean` | derived from in-flight plus two timers (FR-013, FR-013a) |
| preview load state | document preview | `loading \| ready \| error \| unsupported` | FR-007; every previewed file is in exactly one |
| bytes received / total | document preview | `number`, `number \| null` | total is null when the server does not declare a length (FR-014a) |
| buffered fraction | video preview | `number` 0–1 | read from the player's own `buffered` ranges, not tracked by us (FR-014d) |
| submitting | the three login-screen forms | existing status field | sign-in and sign-up stay set through the navigation that follows (FR-012b) |

## Invariants

- No transient state outlives the row or preview it describes (Edge Cases: a row removed
  while busy)
- Two rows in one list hold independent state (FR-004)
- Every state that begins a wait has a path out of it on success, on failure, and on
  fallback (FR-007, SC-004)
