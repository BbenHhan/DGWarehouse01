"use client";

import { useOptimistic, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addRequirement,
  deleteRequirement,
  moveRequirement,
  setGroupDescription,
  updateRequirement,
} from "@/app/actions/group-requirements";
import { EditableName } from "@/components/EditableName";
import { EditableText } from "@/components/EditableText";
import { useManageMode } from "@/components/ManageModeProvider";
import { ReorderButtons } from "@/components/ReorderButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { REQUIREMENT_STATUSES, REQUIREMENT_STATUS_META } from "@/lib/requirement-status";
import type { GroupRequirement, RequirementStatus } from "@/lib/types";
import { useDelayedBusy } from "@/lib/use-delayed-busy";

// specs/046-subgroup-requirement-checklist US2 — keeping the list true in
// management mode.
//
// Status changes and deletes are optimistic (Constitution V, FR-014): the new
// state shows at once, and useOptimistic falls back to the stored props if the
// write fails, so nothing is ever left on screen that was not saved (SC-005).

type OptimisticChange =
  | { type: "status"; id: string; status: RequirementStatus }
  | { type: "delete"; id: string };

function AddRequirementForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  // Held in the provider, like the add-sub-group field, so typing survives
  // leaving and re-entering management mode.
  const { draft, setDraft, clearDraft } = useManageMode();
  const key = `requirement:${groupId}`;
  const value = draft(key);
  const [isPending, startTransition] = useTransition();
  const showBusy = useDelayedBusy(isPending);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addRequirement({ groupId, nameTh: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearDraft(key);
    });
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2">
      <Input
        aria-label={`เพิ่มรายการที่ต้องมีใน ${groupName}`}
        placeholder="เพิ่มรายการเอกสารที่ต้องมี..."
        value={value}
        onChange={(event) => setDraft(key, event.target.value)}
        disabled={isPending}
        className="h-8 text-xs"
      />
      <Button type="submit" size="sm" disabled={isPending || !value.trim()}>
        {showBusy ? (
          <>
            <Spinner />
            กำลังเพิ่ม...
          </>
        ) : (
          "เพิ่ม"
        )}
      </Button>
    </form>
  );
}

export function GroupRequirementsEditor({
  groupId,
  groupName,
  description,
  items,
}: {
  groupId: string;
  groupName: string;
  description?: string | null;
  items: GroupRequirement[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(items, (state, change: OptimisticChange) =>
    change.type === "delete"
      ? state.filter((item) => item.id !== change.id)
      : state.map((item) => (item.id === change.id ? { ...item, status: change.status } : item))
  );

  function setStatus(item: GroupRequirement, status: RequirementStatus) {
    if (item.status === status) return;
    startTransition(async () => {
      applyOptimistic({ type: "status", id: item.id, status });
      const result = await updateRequirement({ id: item.id, status });
      if (!result.ok) toast.error(result.error);
    });
  }

  function remove(item: GroupRequirement) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: item.id });
      const result = await deleteRequirement({ id: item.id });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 p-3">
      <EditableText
        value={description}
        placeholder="คำอธิบายว่าหมวดย่อยนี้ใส่เอกสารอะไร (ไม่บังคับ)"
        ariaLabel={`คำอธิบายของ ${groupName}`}
        className="text-xs text-muted-foreground"
        onSave={(next) => setGroupDescription({ groupId, description: next })}
      />

      {optimisticItems.length > 0 && (
        <ul aria-label={`รายการเอกสารที่ต้องมีของ ${groupName}`} className="flex flex-col gap-2">
          {optimisticItems.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-2">
              <div className="flex flex-wrap items-center gap-1">
                {/* Three tap targets rather than a dropdown: one tap on a phone,
                    and the current state is visible without opening anything
                    (research Decision 8). */}
                <div role="group" aria-label={`สถานะของ ${item.name_th}`} className="flex gap-1">
                  {REQUIREMENT_STATUSES.map((status) => {
                    const meta = REQUIREMENT_STATUS_META[status];
                    const Icon = meta.icon;
                    const pressed = item.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => setStatus(item, status)}
                        className={[
                          // 36px tall: this is tapped on a phone on site, and 27px was too
                          // easy to miss (Constitution IV).
                          "inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
                          pressed ? meta.toneClass : "border-border text-muted-foreground hover:bg-muted",
                        ].join(" ")}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {meta.shortLabel}
                      </button>
                    );
                  })}
                </div>
                <span className="ml-auto flex items-center">
                  <ReorderButtons
                    isFirst={index === 0}
                    isLast={index === optimisticItems.length - 1}
                    label={item.name_th}
                    onMove={(direction) => moveRequirement({ id: item.id, direction })}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`ลบรายการ ${item.name_th}`}
                    onClick={() => remove(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </div>
              <EditableName
                value={item.name_th}
                ariaLabel={`ชื่อรายการ ${item.name_th}`}
                className="text-xs text-foreground"
                onRename={(nameTh) => updateRequirement({ id: item.id, nameTh })}
              />
              <EditableText
                value={item.note}
                placeholder="หมายเหตุ (ไม่บังคับ)"
                ariaLabel={`หมายเหตุของ ${item.name_th}`}
                className="text-xs text-muted-foreground"
                onSave={(note) => updateRequirement({ id: item.id, note })}
              />
            </li>
          ))}
        </ul>
      )}

      <AddRequirementForm groupId={groupId} groupName={groupName} />
    </div>
  );
}
