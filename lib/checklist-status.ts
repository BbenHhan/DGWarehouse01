// specs/032-checklist-detail-status-colors — shared by both the server
// (Server Actions, lib/data.ts) and the client (ChecklistList's optimistic
// reducer), so no "server-only" import here: an item/sub-item's status is
// directly editable only when it has no room tags and no sub-items; when it
// has either, its status is derived by rolling up its rooms' or its
// sub-items' own statuses through this exact rule everywhere it's computed.
export type ChecklistStatus = "todo" | "in_progress" | "done";

export function rollupChecklistStatus(statuses: ChecklistStatus[]): ChecklistStatus {
  if (statuses.length === 0) return "todo";
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.some((status) => status !== "todo")) return "in_progress";
  return "todo";
}
