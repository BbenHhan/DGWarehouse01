"use client";

import { moveCategory, renameCategory } from "@/app/actions/document-taxonomy";
import { ReorderButtons } from "@/components/ReorderButtons";
import { EditableName } from "@/components/EditableName";
import { useManageMode } from "@/components/ManageModeProvider";
import type { DocumentCategory } from "@/lib/types";

// Sits above the tab bar, visible only in management mode
// (specs/040-editable-document-taxonomy).
//
// The tabs cannot carry these controls themselves: they are a horizontally
// scrolling strip on a phone, and hanging a rename field and several buttons off
// each one would be exactly the mis-tap problem that ruled out drag-and-drop for
// reordering. A panel also shows every category at once, which reordering needs
// — you cannot put things in order that you cannot all see. The page itself
// still shows one category at a time, unchanged.
export function CategoryManagePanel({
  categories,
  documentCounts,
}: {
  categories: DocumentCategory[];
  documentCounts: Record<string, number>;
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
          </div>
        ))}
      </div>
    </div>
  );
}
