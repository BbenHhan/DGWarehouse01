"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useDelayedBusy } from "@/lib/use-delayed-busy";
import { Spinner } from "@/components/ui/spinner";
import { CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem } from "@/lib/types";
import type { ChecklistStatus } from "@/lib/checklist-status";
import { getRoomColor, STATUS_COLORS, STATUS_LABELS } from "@/lib/room-colors";
import { formatThaiDate } from "@/lib/date-format";
import { addChecklistItem, setChecklistItemRoomStatus, setChecklistItemStatus } from "@/app/actions/checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OptimisticAction =
  | { type: "add"; item: ChecklistItem }
  | { type: "addSub"; parentId: string; item: ChecklistItem }
  | { type: "updateTop"; id: string; status: ChecklistStatus }
  | { type: "updateSub"; parentId: string; id: string; status: ChecklistStatus };

// Only ever removes/updates exactly the row that's known-for-certain to
// have changed for this room — a "done" status leaves the box outright
// (top-level) or leaves its parent's nested list (sub-item); any other
// status just updates the row in place so its select stays in sync while
// the server request is pending. It deliberately does NOT try to also
// guess whether that leaves the parent itself fully done (specs/029-
// checklist-subitems FR-003): the parent's real rollup depends on *every*
// one of its rooms/sub-items, not just the subset this one room can see, so
// that call is left to the server — the action's revalidatePath corrects
// the box on the next render.
function reduceOptimistic(state: ChecklistItem[], action: OptimisticAction): ChecklistItem[] {
  switch (action.type) {
    case "add":
      return [action.item, ...state];
    case "addSub":
      return state.map((item) =>
        item.id === action.parentId ? { ...item, sub_items: [action.item, ...item.sub_items] } : item
      );
    case "updateTop":
      if (action.status === "done") return state.filter((item) => item.id !== action.id);
      return state.map((item) => (item.id === action.id ? { ...item, status: action.status } : item));
    case "updateSub":
      return state.map((item) => {
        if (item.id !== action.parentId) return item;
        if (action.status === "done") {
          return { ...item, sub_items: item.sub_items.filter((sub) => sub.id !== action.id) };
        }
        return {
          ...item,
          sub_items: item.sub_items.map((sub) => (sub.id === action.id ? { ...sub, status: action.status } : sub)),
        };
      });
  }
}

// Built on the app's own custom Select (matches components/ui/select.tsx
// everywhere else) rather than a native <select> — a native select's popup
// is unstyleable OS chrome, which is why its color never actually showed
// and it looked inconsistent with every other dropdown in the app
// (specs/037-status-select-native-fix).
function StatusSelect({
  status,
  onChange,
  disabled,
  busy,
  selectClass,
  label,
}: {
  status: ChecklistStatus;
  onChange: (status: ChecklistStatus) => void;
  disabled?: boolean;
  busy?: boolean;
  selectClass: string;
  label: string;
}) {
  // Held back briefly so a status change that lands quickly — the common case
  // on a good connection — does not flicker a spinner at the user.
  const showBusy = useDelayedBusy(Boolean(busy));

  return (
    <Select
      value={status}
      onValueChange={(value) => value && onChange(value as ChecklistStatus)}
      disabled={disabled || busy}
    >
      <SelectTrigger size="sm" busy={showBusy} aria-label={label} className={["h-7 shrink-0 gap-1 text-xs font-medium", selectClass].join(" ")}>
        <SelectValue>{STATUS_LABELS[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">{STATUS_LABELS.todo}</SelectItem>
        <SelectItem value="in_progress">{STATUS_LABELS.in_progress}</SelectItem>
        <SelectItem value="done">{STATUS_LABELS.done}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function AddSubInput({
  parentId,
  roomId,
  onAdded,
}: {
  parentId: string;
  roomId: string;
  onAdded: (item: ChecklistItem) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(async () => {
      // Tagged explicitly to this room rather than left untagged
      // (specs/030-checklist-multiroom-subitems research.md Decision 5) — a
      // parent shown here may itself carry no room tags at all, so
      // "untagged inherits the parent's rooms" would inherit nothing.
      const result = await addChecklistItem({ text: trimmed, roomIds: [roomId], parentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onAdded(result.data);
      setText("");
    });
  }

  // Folded away until asked for. Standing open under every entry meant four
  // entries put four input fields on a phone screen, each looking like another
  // row of the list (spec 044 FR-006). Opening it focuses the field, so asking
  // for it and typing stay one gesture.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        เพิ่มรายการย่อย
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-1.5 rounded-lg border border-dashed border-border/70 p-1.5">
      <Input
        ref={inputRef}
        placeholder="เพิ่ม sub..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => !text.trim() && setOpen(false)}
        disabled={isPending}
        className="h-7 text-xs"
      />
      <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={isPending || !text.trim()}>
        เพิ่ม
      </Button>
    </form>
  );
}

// Room-scoped, not-done-only view (specs/028-room-checklist US3) — a quick
// add-and-toggle box on the room/work-type page itself, so an item raised
// during a factory inspection walkthrough never requires leaving the page.
// No edit/delete affordance here on purpose (research.md Decision 2): those
// live on the sitewide /checklist page only, to keep this box fast to use
// on-site rather than full CRUD. Sub-items (specs/029-checklist-subitems)
// follow the same rule — status only, no edit/delete, plus a per-parent
// quick-add. Tinted with the current room's own color throughout (specs/032-
// checklist-detail-status-colors).
export function RoomChecklistBox({
  roomId,
  roomSlug,
  roomName,
  roomEmoji,
  items,
  canEdit,
}: {
  roomId: string;
  roomSlug: string;
  roomName: string;
  roomEmoji: string;
  items: ChecklistItem[];
  canEdit: boolean;
}) {
  const [text, setText] = useState("");
  // The add form and the status controls used to share one transition, so
  // changing any row's status also disabled the add form, and vice versa.
  const [isAdding, startAddTransition] = useTransition();
  const [, startStatusTransition] = useTransition();
  // Which row is being written, not merely whether some row is: a bare
  // boolean marked all twenty rows busy when one status changed.
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [optimisticItems, applyOptimistic] = useOptimistic(items, reduceOptimistic);
  const colors = getRoomColor(roomSlug);

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    startAddTransition(async () => {
      const result = await addChecklistItem({ text: trimmed, roomIds: [roomId] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      applyOptimistic({ type: "add", item: result.data });
      setText("");
    });
  }

  // Every item shown here is, by construction, tagged to this room
  // (specs/031-checklist-room-completion Decision 4) — a status change
  // always writes just this room's own tag, never the item's overall
  // state, so a different room's page can never be affected from here
  // (spec FR-005).
  function handleStatusTop(id: string, status: ChecklistStatus) {
    setBusyItemId(id);
    startStatusTransition(async () => {
      applyOptimistic({ type: "updateTop", id, status });
      const result = await setChecklistItemRoomStatus(id, roomId, status);
      if (!result.ok) {
        toast.error(result.error);
      }
      setBusyItemId(null);
    });
  }

  // A shown sub-item is either explicitly tagged to this room (has its own
  // room tag row — set that one tag's status) or fully untagged, inheriting
  // visibility from its parent (no room tag row of its own, so it falls
  // back to the plain item-level status, unchanged from specs/029).
  function handleStatusSub(parentId: string, sub: ChecklistItem, status: ChecklistStatus) {
    setBusyItemId(sub.id);
    startStatusTransition(async () => {
      applyOptimistic({ type: "updateSub", parentId, id: sub.id, status });
      const result =
        sub.room_ids.length === 0
          ? await setChecklistItemStatus(sub.id, status)
          : await setChecklistItemRoomStatus(sub.id, roomId, status);
      if (!result.ok) {
        toast.error(result.error);
      }
      setBusyItemId(null);
    });
  }

  return (
    <div className={["checklist-box flex flex-col gap-3 rounded-xl border border-border/60 p-3", colors.row].join(" ")}>
      {/* The room is named once here rather than on every row. It went on
          every row at the account holder's request (spec 042 FR-009) and the
          repetition it caused was half of what made this box unreadable
          (spec 044 FR-005) — what that requirement was for, a row never
          leaning on the page heading to say which room it concerns, is served
          by naming the room in the box's own heading. */}
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
        <span className="leading-none">{roomEmoji}</span>
        <span className="min-w-0 truncate">เช็คลิสต์{roomName}</span>
      </p>

      {optimisticItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">ไม่มีรายการค้างอยู่</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {optimisticItems.map((item) => (
            // Each entry is enclosed, the way the sitewide checklist encloses
            // its own. Before this the entry, its sub-items and its add-a-sub
            // field were separated by about as much space as one entry was from
            // the next, so there was nothing to tell the eye where an entry
            // ended (spec 044 FR-001, FR-003).
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{item.text}</p>
                  {item.due_date && (
                    <p className="text-xs text-muted-foreground">ครบกำหนด {formatThaiDate(item.due_date) ?? item.due_date}</p>
                  )}
                </div>
                {item.room_ids.includes(roomId) ? (
                  <StatusSelect
                    status={item.status}
                    onChange={(status) => handleStatusTop(item.id, status)}
                    disabled={!canEdit}
                    busy={busyItemId === item.id}
                    selectClass={colors.select}
                    label={`สถานะของ ${item.text}`}
                  />
                ) : (
                  // Reached this page through a sub-item rather than a tag of
                  // its own, so there is no per-room record here to write to.
                  // Its status is what the sub-items beneath it add up to —
                  // shown, not set, exactly as the sitewide checklist shows an
                  // entry that has sub-items (specs/043 FR-010).
                  <span
                    className={[
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      STATUS_COLORS[item.status].badge,
                    ].join(" ")}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                )}
              </div>

              {item.sub_items.length > 0 && (
                // Sub-items sit inside their parent's card, each in a box of
                // its own, so which entry a sub-item belongs to is a matter of
                // containment rather than of counting indentation (FR-002).
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2">
                  {item.sub_items.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border/50 bg-secondary/40 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{sub.text}</p>
                        {sub.due_date && (
                          <p className="text-xs text-muted-foreground">ครบกำหนด {formatThaiDate(sub.due_date) ?? sub.due_date}</p>
                        )}
                      </div>
                      <StatusSelect
                        status={sub.status}
                        onChange={(status) => handleStatusSub(item.id, sub, status)}
                        disabled={!canEdit}
                        busy={busyItemId === sub.id}
                        selectClass={colors.select}
                        label={`สถานะของ ${sub.text}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {canEdit && (
                <AddSubInput
                  parentId={item.id}
                  roomId={roomId}
                  onAdded={(subItem) => applyOptimistic({ type: "addSub", parentId: item.id, item: subItem })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} className="flex gap-1.5">
          <Input
            placeholder="เพิ่มรายการด่วน..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isAdding}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={isAdding || !text.trim()} aria-busy={isAdding || undefined}>
            {isAdding && <Spinner className="h-3.5 w-3.5" />}
            เพิ่ม
          </Button>
        </form>
      )}
    </div>
  );
}
