# Research: Download a Category as One ZIP

The draft settled the main design; these are the decisions behind the four fixes.

## Decision 1 — Unique names are found by probing, not by counting

**Decision**: When a name is taken, try "name (2)", "name (3)", … until one is free, tracking the names actually used.

**Rationale**: The draft derived the suffix from how many names were already taken, which produces a name that may itself already exist: a sub-group holding "ก.pdf", "ก (3).pdf" and a second "ก.pdf" renames the duplicate to "ก (3).pdf" — the name the third document already has. A ZIP with two identical paths extracts as one file, so a document disappears with no error anywhere (FR-007). Probing cannot collide by construction, whatever the names or their order.

**Alternatives considered**: Appending the document id — unique, but turns a readable file name into a UUID for the officer reading the bundle. Numbering every duplicate from 1 — renames files that had no conflict.

## Decision 2 — Refuse above the format's limits rather than write Zip64

**Decision**: While streaming, fail the download if the running offset would pass 0xFFFFFFFF or the entry count would pass 65,535.

**Rationale**: Those are the ceilings of the 32-bit layout the writer emits. Past them the numbers silently wrap and the file downloads "successfully" and then cannot be opened — the worst failure available, because it is discovered by whoever needed the bundle. The whole app holds 280 MB today (measured 2026-09-17), so the guard should never fire; it exists so that if it ever does, it says so. Zip64 is a real answer but it is a second format to write and test for a case nothing approaches.

**Alternatives considered**: Implementing Zip64 — disproportionate. Ignoring it — the current behaviour, which is a silent corruption.

## Decision 3 — Keep the download a route handler

**Decision**: Leave it at `GET /api/documents/[categorySlug]/zip`.

**Rationale**: The response *is* the file; Constitution II reserves Server Actions for mutations, and two read-only file routes already exist. A plain link also gets the browser's own download progress for free, which matters at 137 MB.

## Decision 4 — The header carries both names

**Decision**: `filename*=UTF-8''…` carries the Thai name; `filename="…"` carries an ASCII-only fallback, with every non-ASCII character replaced and a plain default if nothing survives.

**Rationale**: Header values must be Latin-1 — a Thai character in the fallback throws when the response is constructed, turning a download into a 500. Slugs are ASCII today ("checklist-permit", "category-7"), so this is a guard rather than a fix for something seen in production.

## Decision 5 — The archive reader lives in a shared test helper

**Decision**: Move `lib/zip.test.ts`'s central-directory parser into `lib/zip-test-helpers.ts` and use it from the route test too.

**Rationale**: The route test must prove the bytes it returns are a real archive; reading them the way `unzip` does is the only check that catches a header the writer got wrong. Duplicating the parser would let the two copies drift.
