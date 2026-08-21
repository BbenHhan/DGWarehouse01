"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckSquare, Copy, Grid2x2, LayoutGrid, List, RefreshCw, Trash2, Video } from "lucide-react";
import type { UnsortedFile } from "@/components/BulkUploadWorkspace";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ViewMode = "large" | "medium" | "list";

const VIEW_MODE_OPTIONS: Array<{ mode: ViewMode; label: string; icon: React.ReactNode }> = [
  { mode: "large", label: "รูปใหญ่", icon: <LayoutGrid className="h-4 w-4" aria-hidden="true" /> },
  { mode: "medium", label: "รูปกลาง", icon: <Grid2x2 className="h-4 w-4" aria-hidden="true" /> },
  { mode: "list", label: "รายการ", icon: <List className="h-4 w-4" aria-hidden="true" /> },
];

const GRID_CLASS: Record<Exclude<ViewMode, "list">, string> = {
  large: "grid-cols-2 sm:grid-cols-3",
  medium: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
};

// Desktop/tablet-only grid (or list) of not-yet-sorted files — drag source
// for the room-tab/work-type-bin drop targets (specs/015-multi-upload-drag-sort
// User Story 1). Mobile uses components/MobileSwipeCard.tsx instead, so this
// component has no tap-select affordance. View mode is a display-only
// preference (not part of the upload session state) added after live
// feedback that small thumbnails made it hard to tell photos apart, and
// that a filename-first list view helps when source files are already
// named with a date. Clicking a file (rather than dragging it) opens a
// larger preview popup.
//
// Multi-select (added after further feedback): a toggle button switches on
// checkboxes for every chip; Shift+click selects a contiguous range from
// the last-clicked item, Ctrl/Cmd+click toggles one item without touching
// the rest of the selection (and both work even with the toggle off, same
// as a typical file manager). Dragging any selected chip carries the whole
// selection, so a multi-selected batch can be dropped into one bin together
// in a single gesture — reuses the existing multi-target assignFiles path,
// no new upload logic.
export function UnsortedFileTray({
  files,
  onRetry,
  onDuplicate,
  onRemove,
}: {
  files: UnsortedFile[];
  onRetry: (fileId: string) => void;
  onDuplicate: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("medium");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndex = useRef<number | null>(null);

  useEffect(() => {
    const validIds = new Set(files.map((f) => f.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
        ยังไม่มีไฟล์ — เพิ่มไฟล์ด้านบนเพื่อเริ่มจัดหมวดหมู่
      </div>
    );
  }

  const previewItem = files.find((f) => f.id === previewId) ?? null;

  function handleItemClick(fileId: string, index: number, e: React.MouseEvent) {
    const rangeSelect = e.shiftKey;
    const toggleSelect = e.ctrlKey || e.metaKey;

    if (!selectionMode && !rangeSelect && !toggleSelect) {
      setPreviewId(fileId);
      return;
    }

    if (rangeSelect && lastClickedIndex.current !== null) {
      const [start, end] = [lastClickedIndex.current, index].sort((a, b) => a - b);
      const rangeIds = files.slice(start, end + 1).map((f) => f.id);
      setSelectedIds((prev) => new Set([...prev, ...rangeIds]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
      lastClickedIndex.current = index;
    }

    if (!selectionMode) setSelectionMode(true);
  }

  function handleDragStart(item: UnsortedFile, e: React.DragEvent) {
    const ids = selectedIds.has(item.id) && selectedIds.size > 1 ? Array.from(selectedIds) : [item.id];
    e.dataTransfer.setData("text/plain", ids.join(","));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `เลือกแล้ว ${selectedIds.size} รูป — ลากไปยังห้อง/หมวดงานทางขวา`
            : `ยังไม่ระบุหมวดหมู่ (${files.length}) — คลิกเพื่อดูรูปใหญ่ ลากไปยังห้อง/หมวดงานทางขวา`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="เลือกหลายรูป"
            aria-label="เลือกหลายรูป"
            aria-pressed={selectionMode}
            onClick={() => {
              setSelectionMode((prev) => !prev);
              setSelectedIds(new Set());
              lastClickedIndex.current = null;
            }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border",
              selectionMode
                ? "border-primary bg-primary/12 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {VIEW_MODE_OPTIONS.map((option) => (
              <button
                key={option.mode}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={viewMode === option.mode}
                onClick={() => setViewMode(option.mode)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  viewMode === option.mode
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="flex flex-col gap-1.5">
          {files.map((item, index) => (
            <FileListRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              showCheckbox={selectionMode}
              onRetry={onRetry}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
              onClick={(e) => handleItemClick(item.id, index, e)}
              onDragStart={(e) => handleDragStart(item, e)}
            />
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-3", GRID_CLASS[viewMode])}>
          {files.map((item, index) => (
            <FileGridChip
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              showCheckbox={selectionMode}
              onRetry={onRetry}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
              onClick={(e) => handleItemClick(item.id, index, e)}
              onDragStart={(e) => handleDragStart(item, e)}
            />
          ))}
        </div>
      )}

      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-2xl" showCloseButton>
          <DialogTitle className="sr-only">{previewItem?.file.name ?? "ดูรูปใหญ่"}</DialogTitle>
          {previewItem?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- transient client-side object URL preview, not the final stored photo
            <img
              src={previewItem.previewUrl}
              alt=""
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Video className="h-10 w-10" aria-hidden="true" />
              <p className="text-sm">{previewItem?.file.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectCheckbox({ selected, onImage }: { selected: boolean; onImage?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2",
        onImage && "shadow-[0_1px_4px_rgba(0,0,0,.35)]",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : onImage
            ? "border-white bg-black/40 text-transparent"
            : "border-border bg-card text-transparent"
      )}
    >
      <Check className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function FileGridChip({
  item,
  selected,
  showCheckbox,
  onRetry,
  onDuplicate,
  onRemove,
  onClick,
  onDragStart,
}: {
  item: UnsortedFile;
  selected: boolean;
  showCheckbox: boolean;
  onRetry: (fileId: string) => void;
  onDuplicate: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={item.status !== "uploading"}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-card text-center",
        selected ? "border-primary" : "border-border",
        item.status === "uploading" && "opacity-60"
      )}
    >
      {showCheckbox && (
        <span className="absolute left-1.5 top-1.5 z-10">
          <SelectCheckbox selected={selected} onImage />
        </span>
      )}

      <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
        <button
          type="button"
          title="ทำสำเนารูปนี้"
          aria-label="ทำสำเนารูปนี้"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(item.id);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-white bg-black/40 text-white shadow-[0_1px_4px_rgba(0,0,0,.35)]"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          title="เอารูปนี้ออก"
          aria-label="เอารูปนี้ออก"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-white bg-black/40 text-white shadow-[0_1px_4px_rgba(0,0,0,.35)] hover:bg-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {item.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- transient client-side object URL preview, not the final stored photo
        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Video className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      )}

      {selected && <div className="pointer-events-none absolute inset-0 bg-primary/30" />}

      {item.status === "uploading" && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">
          กำลังอัปโหลด...
        </span>
      )}

      {item.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/10 p-1 text-center">
          <p className="line-clamp-2 text-[10px] text-destructive">{item.errorMessage}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(item.id);
            }}
            className="flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            ลองใหม่
          </button>
        </div>
      )}
    </div>
  );
}

function FileListRow({
  item,
  selected,
  showCheckbox,
  onRetry,
  onDuplicate,
  onRemove,
  onClick,
  onDragStart,
}: {
  item: UnsortedFile;
  selected: boolean;
  showCheckbox: boolean;
  onRetry: (fileId: string) => void;
  onDuplicate: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={item.status !== "uploading"}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-2 py-1.5",
        selected ? "border-primary bg-primary/15" : "border-border bg-card",
        item.status === "uploading" && "opacity-60"
      )}
    >
      {showCheckbox && <SelectCheckbox selected={selected} />}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
        {item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- transient client-side object URL preview, not the final stored photo
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Video className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm">{item.file.name}</span>

      {item.status === "uploading" && (
        <span className="shrink-0 text-xs text-muted-foreground">กำลังอัปโหลด...</span>
      )}

      {item.status === "error" && (
        <div className="flex shrink-0 items-center gap-2">
          <p className="max-w-[10rem] truncate text-xs text-destructive">{item.errorMessage}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(item.id);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            ลองใหม่
          </button>
        </div>
      )}

      <button
        type="button"
        title="ทำสำเนารูปนี้"
        aria-label="ทำสำเนารูปนี้"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(item.id);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        title="เอารูปนี้ออก"
        aria-label="เอารูปนี้ออก"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
