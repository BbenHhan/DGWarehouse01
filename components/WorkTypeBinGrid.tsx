"use client";

import type { WorkType } from "@/lib/types";

// Drop targets for the active room's work types — dropping an unsorted file
// chip here assigns it to (active room, this work type) and immediately
// starts its upload (specs/015-multi-upload-drag-sort spec.md FR-004/FR-006).
// Dragging a multi-selected chip (components/UnsortedFileTray.tsx) carries
// every selected file's id, comma-separated, so a whole selection can be
// dropped into one bin together.
export function WorkTypeBinGrid({
  workTypes,
  binCounts,
  activeRoomId,
  onDropFiles,
}: {
  workTypes: WorkType[];
  binCounts: Record<string, number>;
  activeRoomId: string;
  onDropFiles: (fileIds: string[], workTypeId: string) => void;
}) {
  return (
    // Fixed 2-column grid — this grid lives inside a fixed-width sticky
    // sidebar column (specs/015-multi-upload-drag-sort layout revision), so
    // sizing by viewport breakpoint (sm:/md:) would cramp it on wide
    // screens where the sidebar itself stays narrow.
    <div className="grid grid-cols-2 gap-3">
      {workTypes.map((workType) => {
        const key = `${activeRoomId}::${workType.id}`;
        const count = binCounts[key] ?? 0;
        return (
          <div
            key={workType.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const payload = e.dataTransfer.getData("text/plain");
              const fileIds = payload.split(",").filter(Boolean);
              if (fileIds.length > 0) onDropFiles(fileIds, workType.id);
            }}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-background p-3 text-center transition-colors hover:border-primary/50"
          >
            <span className="text-xl">{workType.emoji}</span>
            <span className="text-xs">{workType.name_th}</span>
            <span className="text-sm font-medium text-primary">{count} รูป</span>
          </div>
        );
      })}
    </div>
  );
}
