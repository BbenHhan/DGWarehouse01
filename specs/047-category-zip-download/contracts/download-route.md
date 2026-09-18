# Contract: `GET /api/documents/[categorySlug]/zip`

| Case | Status | Body | Notes |
|---|---|---|---|
| Not signed in | 401 | `{ "error": "กรุณาเข้าสู่ระบบก่อนดาวน์โหลด" }` | No archive bytes are produced (FR-011, SC-005). |
| Unknown category slug | 404 | `{ "error": "ไม่พบหมวดนี้" }` | |
| Signed in, category exists | 200 | ZIP stream | Any role, viewers included (FR-001). |

**Headers on 200**

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="<ascii fallback>.zip"; filename*=UTF-8''<percent-encoded Thai name>` (FR-012)
- `Cache-Control: no-store` — the archive is built from live rows; a cached copy would hand back yesterday's documents.

**Body**

Entries in order: the category folder, then each sub-group folder followed by its files, then the ungrouped folder if needed. Every name is flagged UTF-8 (FR-006). Produced progressively, one document in memory at a time (FR-009).

**Failure while streaming**

If the running size or entry count would pass the format's limits, the stream errors (FR-010): the browser reports a failed download rather than saving a file that will not open. A document whose stored object is missing is skipped silently (FR-008) — the rest of the bundle is still worth having.
