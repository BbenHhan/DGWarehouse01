# Research: Upload Tray Persistence

## Decision 1: IndexedDB, not localStorage

**Decision**: Persist tray files in IndexedDB (`lib/upload-tray-db.ts`), not `localStorage`.

**Rationale**: The tray holds actual `File`/`Blob` objects (the picked photos themselves, up to 300MB each per Constitution VIII's size ceiling), not just metadata. `localStorage` only stores strings — a `File` object can't be serialized into it without base64-encoding megabytes of binary data into a ~5MB-quota string store, which would fail immediately for any real photo batch. IndexedDB natively stores `Blob`/`File` objects and has a much larger, browser-managed quota, making it the only viable client-side persistence mechanism for this data shape.

**Alternatives considered**: Uploading immediately on pick and only "confirming" categorization later (server-side staging) — rejected as a much larger architectural change that reintroduces exactly the kind of pre-staging complexity Feature 018 had just finished removing from the upload flow; also unnecessary, since the actual requirement (survive a refresh) has a purely client-side solution.

## Decision 2: Restored files always come back "waiting", never "uploading"

**Decision**: The `status` field is never persisted/restored — every rehydrated file gets `status: "waiting"` regardless of what it was mid-flight.

**Rationale**: An in-flight "uploading" status has no meaning after a reload (the actual network request is gone) — carrying it over would show a permanently stuck spinner with no way to retry. Resetting to "waiting" lets the normal retry/re-drag flow just work.

## Decision 3: Date remembered via `localStorage`, not IndexedDB

**Decision**: The chosen upload date uses plain `localStorage` (a single string), separate from the IndexedDB file store.

**Rationale**: Unlike files, a date is already a small string with no `Blob` involved — `localStorage`'s simple synchronous string API is the right-sized tool, and mixing it into the same IndexedDB store as file blobs would add complexity for no benefit.
