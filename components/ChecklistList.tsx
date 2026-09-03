"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useDelayedBusy } from "@/lib/use-delayed-busy";
import { Spinner } from "@/components/ui/spinner";
import { CheckSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem, Room } from "@/lib/types";
import type { ChecklistStatus } from "@/lib/checklist-status";
import { rollupChecklistStatus } from "@/lib/checklist-status";
import { getRoomColor, STATUS_COLORS, STATUS_LABELS } from "@/lib/room-colors";
import { formatThaiDate } from "@/lib/date-format";
import {
  addChecklistItem,
  deleteChecklistItem,
  editChecklistItem,
  setChecklistItemRoomStatus,
  setChecklistItemStatus,
} from "@/app/actions/checklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OptimisticAction =
  | { type: "add"; item: ChecklistItem }
  | { type: "setStatus"; id: string; status: ChecklistStatus }
  | { type: "setRoomStatus"; id: string; roomId: string; status: ChecklistStatus }
  | { type: "edit"; id: string; text?: string; roomIds?: string[]; detail?: string | null; startDate?: string | null; dueDate?: string | null }
  | { type: "delete"; id: string };

// One level of nesting only (specs/029-checklist-subitems FR-009), so these
// helpers never recurse — they check the top-level array, then each item's
// own sub_items, and stop.
function findItem(
  state: ChecklistItem[],
  id: string
): { item: ChecklistItem; parent?: ChecklistItem } | undefined {
  for (const item of state) {
    if (item.id === id) return { item };
    const sub = item.sub_items.find((s) => s.id === id);
    if (sub) return { item: sub, parent: item };
  }
  return undefined;
}

function updateItem(
  state: ChecklistItem[],
  id: string,
  updater: (item: ChecklistItem) => ChecklistItem
): ChecklistItem[] {
  return state.map((item) => {
    if (item.id === id) return updater(item);
    if (item.sub_items.some((s) => s.id === id)) {
      return { ...item, sub_items: item.sub_items.map((s) => (s.id === id ? updater(s) : s)) };
    }
    return item;
  });
}

function removeItem(state: ChecklistItem[], id: string): ChecklistItem[] {
  return state
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, sub_items: item.sub_items.filter((s) => s.id !== id) }));
}

// Applies a single room tag's status to an item and recomputes that item's
// own derived status from all its room tags (specs/032-checklist-detail-
// status-colors) — the client-side mirror of what setChecklistItemRoomStatus
// does server-side.
function applyRoomStatus(item: ChecklistItem, roomId: string, status: ChecklistStatus): ChecklistItem {
  const room_statuses = item.room_statuses.map((rs) => (rs.room_id === roomId ? { ...rs, status } : rs));
  return {
    ...item,
    room_statuses,
    status: room_statuses.length > 0 ? rollupChecklistStatus(room_statuses.map((rs) => rs.status)) : item.status,
  };
}

function reduceOptimistic(state: ChecklistItem[], action: OptimisticAction): ChecklistItem[] {
  switch (action.type) {
    case "add":
      if (!action.item.parent_id) return [action.item, ...state];
      return state.map((item) =>
        item.id === action.item.parent_id
          ? { ...item, sub_items: [action.item, ...item.sub_items] }
          : item
      );
    case "setStatus": {
      const found = findItem(state, action.id);
      if (!found) return state;
      if (found.parent) {
        // Upward sync (specs/029-checklist-subitems FR-003), now 3-way.
        return state.map((item) => {
          if (item.id !== found.parent!.id) return item;
          const subItems = item.sub_items.map((s) =>
            s.id === action.id ? { ...s, status: action.status } : s
          );
          return { ...item, sub_items: subItems, status: rollupChecklistStatus(subItems.map((s) => s.status)) };
        });
      }
      // Downward cascade (FR-004), now 3-way.
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: action.status,
              sub_items: item.sub_items.map((s) => ({ ...s, status: action.status })),
            }
          : item
      );
    }
    case "setRoomStatus": {
      const found = findItem(state, action.id);
      if (!found) return state;
      if (found.parent) {
        return state.map((item) => {
          if (item.id !== found.parent!.id) return item;
          const subItems = item.sub_items.map((s) =>
            s.id === action.id ? applyRoomStatus(s, action.roomId, action.status) : s
          );
          return { ...item, sub_items: subItems, status: rollupChecklistStatus(subItems.map((s) => s.status)) };
        });
      }
      return state.map((item) => (item.id === action.id ? applyRoomStatus(item, action.roomId, action.status) : item));
    }
    case "edit":
      return updateItem(state, action.id, (item) => ({
        ...item,
        ...(action.text !== undefined ? { text: action.text } : {}),
        ...(action.roomIds !== undefined ? { room_ids: action.roomIds } : {}),
        ...(action.detail !== undefined ? { detail: action.detail } : {}),
        ...(action.startDate !== undefined ? { start_date: action.startDate } : {}),
        ...(action.dueDate !== undefined ? { due_date: action.dueDate } : {}),
      }));
    case "delete":
      return removeItem(state, action.id);
  }
}

// A small, shared 3-state control — room-tinted when roomColorSelect is
// given, fixed status colors otherwise (spec FR-008: status color and room
// color never mix on the same element). Built on the app's own custom
// Select (components/ui/select.tsx) rather than a native <select> — a
// native select's own dropdown popup is unstyleable OS chrome (the same
// class of problem specs/035-select-dropdown-polish already fixed for the
// document group field), which is why the color never actually showed up
// on it and it looked inconsistent with every other dropdown in the app.
function StatusSelect({
  status,
  onChange,
  disabled,
  busy,
  roomColorSelect,
  label,
}: {
  status: ChecklistStatus;
  onChange: (status: ChecklistStatus) => void;
  disabled?: boolean;
  busy?: boolean;
  roomColorSelect?: string;
  label: string;
}) {
  const showBusy = useDelayedBusy(Boolean(busy));

  return (
    <Select
      value={status}
      onValueChange={(value) => value && onChange(value as ChecklistStatus)}
      disabled={disabled || busy}
    >
      <SelectTrigger
        size="sm"
        busy={showBusy}
        aria-label={label}
        className={["h-8 gap-1 text-xs font-medium", roomColorSelect ?? STATUS_COLORS[status].select].join(" ")}
      >
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

function DateLine({ startDate, dueDate }: { startDate: string | null; dueDate: string | null }) {
  if (!startDate && !dueDate) return null;
  const parts: string[] = [];
  if (startDate) parts.push(`เริ่ม ${formatThaiDate(startDate) ?? startDate}`);
  if (dueDate) parts.push(`ครบกำหนด ${formatThaiDate(dueDate) ?? dueDate}`);
  return <p className="mt-1 text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

// Toggleable room-tag chips shared by the add-form and the edit dialog.
function RoomChipPicker({
  rooms,
  selected,
  onToggle,
}: {
  rooms: Room[];
  selected: string[];
  onToggle: (roomId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {rooms.map((room) => {
        const active = selected.includes(room.id);
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onToggle(room.id)}
            className={[
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-transparent bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            ].join(" ")}
          >
            <span className="leading-none">{room.emoji}</span>
            {room.name_th}
          </button>
        );
      })}
    </div>
  );
}

function AddChecklistForm({
  rooms,
  parentId,
  autoFocus,
  onAdded,
}: {
  rooms: Room[];
  parentId?: string;
  autoFocus?: boolean;
  onAdded: (item: ChecklistItem) => void;
}) {
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleRoom(roomId: string) {
    setRoomIds((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await addChecklistItem({
        text: trimmed,
        roomIds,
        parentId,
        detail: detail.trim() || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onAdded(result.data);
      setText("");
      setDetail("");
      setStartDate("");
      setDueDate("");
      setRoomIds([]);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3">
      <Input
        placeholder={parentId ? "พิมพ์ sub-item..." : "พิมพ์รายการที่ต้องทำ..."}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={isPending}
        autoFocus={autoFocus}
      />
      <textarea
        placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        disabled={isPending}
        rows={2}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          เริ่ม
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={isPending}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          ครบกำหนด
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={isPending}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
          />
        </label>
      </div>
      <RoomChipPicker rooms={rooms} selected={roomIds} onToggle={toggleRoom} />
      <Button type="submit" size="sm" className="self-start" disabled={isPending || !text.trim()}>
        {isPending && <Spinner className="h-3.5 w-3.5" />}
        {parentId ? "เพิ่ม sub" : "เพิ่มรายการ"}
      </Button>
    </form>
  );
}

function EditChecklistDialog({
  item,
  rooms,
  onSaved,
}: {
  item: ChecklistItem;
  rooms: Room[];
  onSaved: (id: string, updates: { text: string; roomIds: string[]; detail: string | null; startDate: string | null; dueDate: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(item.text);
  const [detail, setDetail] = useState(item.detail ?? "");
  const [startDate, setStartDate] = useState(item.start_date ?? "");
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [roomIds, setRoomIds] = useState<string[]>(item.room_ids);
  const [isPending, startTransition] = useTransition();

  function toggleRoom(roomId: string) {
    setRoomIds((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    );
  }

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const updates = {
      text: trimmed,
      roomIds,
      detail: detail.trim() || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
    };

    startTransition(async () => {
      const result = await editChecklistItem({ id: item.id, ...updates });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onSaved(item.id, updates);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setText(item.text);
          setDetail(item.detail ?? "");
          setStartDate(item.start_date ?? "");
          setDueDate(item.due_date ?? "");
          setRoomIds(item.room_ids);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="icon-sm" variant="outline" aria-label={`แก้ไข ${item.text}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไขรายการ</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input value={text} onChange={(event) => setText(event.target.value)} disabled={isPending} />
          <textarea
            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            disabled={isPending}
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              เริ่ม
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={isPending}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              ครบกำหนด
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isPending}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
              />
            </label>
          </div>
          <RoomChipPicker rooms={rooms} selected={roomIds} onToggle={toggleRoom} />
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !text.trim()}>
            {isPending && <Spinner className="h-4 w-4" />}
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistRow({
  item,
  rooms,
  canEdit,
  nested,
  onAdded,
  onSetStatus,
  onSetRoomStatus,
  onSaved,
  onDelete,
  busyKey,
}: {
  item: ChecklistItem;
  rooms: Room[];
  canEdit: boolean;
  nested?: boolean;
  busyKey: string | null;
  onAdded: (item: ChecklistItem) => void;
  onSetStatus: (id: string, status: ChecklistStatus) => void;
  onSetRoomStatus: (id: string, roomId: string, status: ChecklistStatus) => void;
  onSaved: (id: string, updates: { text: string; roomIds: string[]; detail: string | null; startDate: string | null; dueDate: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [addingSub, setAddingSub] = useState(false);
  // Status is only directly settable when nothing else derives it — no room
  // tags, no sub-items (specs/032-checklist-detail-status-colors FR-004).
  const directlyEditable = item.room_ids.length === 0 && item.sub_items.length === 0;
  const multiRoom = item.room_ids.length >= 2;

  return (
    <div className={["flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3", nested ? "bg-card/60" : ""].join(" ")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{item.text}</p>
          {item.detail && <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>}
          <DateLine startDate={item.start_date} dueDate={item.due_date} />

          {!multiRoom && (
            <div className="mt-2 flex items-center gap-2">
              {directlyEditable ? (
                <StatusSelect
                  status={item.status}
                  onChange={(status) => onSetStatus(item.id, status)}
                  disabled={!canEdit}
                  busy={busyKey === item.id}
                  label={`สถานะของ ${item.text}`}
                />
              ) : item.room_ids.length === 1 ? (
                <StatusSelect
                  status={item.status}
                  onChange={(status) => onSetRoomStatus(item.id, item.room_ids[0], status)}
                  disabled={!canEdit}
                  busy={busyKey === `${item.id}:${item.room_ids[0]}`}
                  roomColorSelect={getRoomColor(rooms.find((r) => r.id === item.room_ids[0])?.slug ?? "").select}
                  label={`สถานะของ ${item.text}`}
                />
              ) : (
                <span className={["rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[item.status].badge].join(" ")}>
                  {STATUS_LABELS[item.status]}
                </span>
              )}
            </div>
          )}

          {multiRoom && (
            <div className="mt-2 flex flex-col gap-1.5">
              <span className={["self-start rounded-full px-2.5 py-1 text-xs font-medium", STATUS_COLORS[item.status].badge].join(" ")}>
                {STATUS_LABELS[item.status]}
              </span>
              {item.room_statuses.map((rs) => {
                const room = rooms.find((r) => r.id === rs.room_id);
                const colors = getRoomColor(room?.slug ?? "");
                return (
                  <div key={rs.room_id} className={["flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5", colors.row].join(" ")}>
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <span className="leading-none">{room?.emoji}</span>
                      {room ? room.name_th : rs.room_id}
                    </span>
                    <StatusSelect
                      status={rs.status}
                      onChange={(status) => onSetRoomStatus(item.id, rs.room_id, status)}
                      disabled={!canEdit}
                      busy={busyKey === `${item.id}:${rs.room_id}`}
                      roomColorSelect={colors.select}
                      label={`สถานะของ ${room?.name_th ?? rs.room_id}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex shrink-0 gap-1">
            {!nested && (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={`เพิ่ม sub ให้ ${item.text}`}
                onClick={() => setAddingSub((current) => !current)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <EditChecklistDialog item={item} rooms={rooms} onSaved={onSaved} />

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" size="icon-sm" variant="destructive" aria-label={`ลบรายการ ${item.text}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบรายการนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {!nested && item.sub_items.length > 0
                      ? "การลบนี้ไม่สามารถย้อนกลับได้ และจะลบ sub-item ทั้งหมดของรายการนี้ด้วย"
                      : "การลบนี้ไม่สามารถย้อนกลับได้"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(item.id)}>ลบ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {!nested && addingSub && canEdit && (
        <div className="pl-7">
          <AddChecklistForm
            rooms={rooms}
            parentId={item.id}
            autoFocus
            onAdded={(subItem) => {
              onAdded(subItem);
              setAddingSub(false);
            }}
          />
        </div>
      )}

      {!nested && item.sub_items.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border/50 pt-2 pl-7">
          {item.sub_items.map((sub) => (
            <ChecklistRow
              key={sub.id}
              item={sub}
              rooms={rooms}
              canEdit={canEdit}
              nested
              onAdded={onAdded}
              onSetStatus={onSetStatus}
              onSetRoomStatus={onSetRoomStatus}
              onSaved={onSaved}
              onDelete={onDelete}
              busyKey={busyKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ChecklistList({
  items,
  rooms,
  canEdit,
}: {
  items: ChecklistItem[];
  rooms: Room[];
  canEdit: boolean;
}) {
  const [, startTransition] = useTransition();
  // Identifies the single control being written, not merely that something is.
  // An item's own status is keyed by its id; a per-room status by both, since
  // one item can show a separate control for each of its rooms.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [optimisticItems, applyOptimistic] = useOptimistic(items, reduceOptimistic);

  function handleAdded(item: ChecklistItem) {
    startTransition(() => {
      applyOptimistic({ type: "add", item });
    });
  }

  function handleSetStatus(id: string, status: ChecklistStatus) {
    setBusyKey(id);
    startTransition(async () => {
      applyOptimistic({ type: "setStatus", id, status });
      const result = await setChecklistItemStatus(id, status);
      if (!result.ok) {
        toast.error(result.error);
      }
      setBusyKey(null);
    });
  }

  function handleSetRoomStatus(id: string, roomId: string, status: ChecklistStatus) {
    setBusyKey(`${id}:${roomId}`);
    startTransition(async () => {
      applyOptimistic({ type: "setRoomStatus", id, roomId, status });
      const result = await setChecklistItemRoomStatus(id, roomId, status);
      if (!result.ok) {
        toast.error(result.error);
      }
      setBusyKey(null);
    });
  }

  function handleSaved(
    id: string,
    updates: { text: string; roomIds: string[]; detail: string | null; startDate: string | null; dueDate: string | null }
  ) {
    startTransition(() => {
      applyOptimistic({ type: "edit", id, ...updates });
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const result = await deleteChecklistItem(id);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <AddChecklistForm rooms={rooms} onAdded={handleAdded} />}

      {optimisticItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
          <CheckSquare className="h-8 w-8 opacity-50" />
          <p className="font-medium">ยังไม่มีรายการเช็คลิสต์</p>
          {canEdit && <p className="text-sm">เพิ่มรายการแรกด้านบน</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {optimisticItems.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              rooms={rooms}
              canEdit={canEdit}
              onAdded={handleAdded}
              onSetStatus={handleSetStatus}
              onSetRoomStatus={handleSetRoomStatus}
              onSaved={handleSaved}
              onDelete={handleDelete}
              busyKey={busyKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}
