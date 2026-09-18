# Data Model: Download a Category as One ZIP

No database change. No table, column, or stored record is added, and nothing about a document is written.

The only structure is the archive built in memory per request:

| Concept | Shape | Rules |
|---|---|---|
| Archive entry | `{ path, data? }` | A path ending in "/" with no data is a folder. Paths are unique within one archive (FR-007). |
| Root folder | `หมวดที่ <sort_order> <name_th>` | Characters that would add a folder level ("/", ":", "\\") are replaced. |
| Sub-group folder | `<category>.<group> <name_th>` | The app's own label, in the editor's order. Present even when empty (FR-004). |
| Ungrouped folder | `ไม่ได้ระบุหมวดย่อย` | Present only when such documents exist (FR-005). |
| File entry | document's `file_name` | Deduplicated by probing " (n)" before the extension (research Decision 1). Skipped when its stored object cannot be read (FR-008). |

Limits enforced while writing (FR-010): at most 65,535 entries and a total size below 4 GB.
