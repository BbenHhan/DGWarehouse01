"use client";

import { createCategory, moveCategory, renameCategory } from "@/app/actions/document-taxonomy";
import { ReorderButtons } from "@/components/ReorderButtons";
import { DeleteTaxonomyDialog } from "@/components/DeleteTaxonomyDialog";
import { EditableName } from "@/components/EditableName";
import { useManageMode } from "@/components/ManageModeProvider";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

// Sits above the tab bar, visible only in management mode
// (specs/040-editable-document-taxonomy).
//
// The tabs cannot carry these controls themselves: they are a horizontally
// scrolling strip on a phone, and hanging a rename field and several buttons off
// each one would be exactly the mis-tap problem that ruled out drag-and-drop for
// reordering. A panel also shows every category at once, which reordering needs
// — you cannot put things in order that you cannot all see. The page itself
// still shows one category at a time, unchanged.
// Its text lives in the shared manage-mode state, not here, so leaving
// management mode and coming back does not discard it (FR-025). The draft key is
// distinct from any category id, so it cannot collide with a sub-group draft.
const NEW_CATEGORY_DRAFT = "__new-category__";

function AddCategoryForm() {
  const { draft, setDraft, clearDraft } = useManageMode();
  const [isPending, startTransition] = useTransition();
  const value = draft(NEW_CATEGORY_DRAFT);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createCategory({ nameTh: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearDraft(NEW_CATEGORY_DRAFT);
    });
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2 pt-2">
      <Input
        placeholder="เพิ่มหมวดใหญ่ เช่น หมวดที่ 5 ..."
        value={value}
        onChange={(event) => setDraft(NEW_CATEGORY_DRAFT, event.target.value)}
        disabled={isPending}
        className="h-9 text-sm"
      />
      <Button type="submit" size="sm" disabled={isPending || !value.trim()}>
        {isPending ? "กำลังเพิ่ม..." : "เพิ่ม"}
      </Button>
    </form>
  );
}

export function CategoryManagePanel({
  categories,
  documentCounts,
  allGroups,
}: {
  categories: DocumentCategory[];
  documentCounts: Record<string, number>;
  allGroups: DocumentGroup[];
}) {
  const { managing } = useManageMode();
  if (!managing) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-card/40 p-3">
      <p className="mb-2 text-xs text-muted-foreground">หมวดใหญ่</p>
      <div className="flex flex-col">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-2 border-b border-border/60 py-1.5 last:border-b-0"
          >
            <span className="shrink-0 text-base leading-none">{category.emoji}</span>
            <EditableName
              value={category.name_th}
              ariaLabel={`ชื่อหมวด ${category.name_th}`}
              className="text-sm text-foreground"
              onRename={(nameTh) => renameCategory({ id: category.id, nameTh })}
            />
            <span className="shrink-0 text-xs text-muted-foreground">
              {documentCounts[category.id] ?? 0} ไฟล์
            </span>
            <ReorderButtons
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              label={category.name_th}
              onMove={(direction) => moveCategory({ id: category.id, direction })}
            />
            <DeleteTaxonomyDialog
              target={{ kind: "category", id: category.id, name: category.name_th }}
              documentCount={documentCounts[category.id] ?? 0}
              categories={categories}
              allGroups={allGroups}
            />
          </div>
        ))}
      </div>
      <AddCategoryForm />
    </div>
  );
}
