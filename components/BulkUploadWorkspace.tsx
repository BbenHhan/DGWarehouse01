"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Room, WorkType } from "@/lib/types";
import { MAX_BATCH_FILES, PHOTO_MIME_TYPES } from "@/lib/validation";
import { uploadPhoto } from "@/app/actions/photos";
import { deleteTrayFile, loadAllTrayFiles, saveTrayFile } from "@/lib/upload-tray-db";
import { UploadDatePicker } from "@/components/UploadDatePicker";
import { UnsortedFileTray } from "@/components/UnsortedFileTray";
import { RoomTabBar } from "@/components/RoomTabBar";
import { WorkTypeBinGrid } from "@/components/WorkTypeBinGrid";
import { MobileSwipeCard } from "@/components/MobileSwipeCard";
import { Button } from "@/components/ui/button";

const UPLOAD_DATE_STORAGE_KEY = "dgwh-upload-date";

function todayIsoLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Client-session state for one visit to the bulk-upload page — not saved as
// its own DB record (only what gets sorted into a bin becomes a real photo
// row), but persisted to IndexedDB (lib/upload-tray-db.ts) so a page
// refresh, closed tab, or the dev server restarting mid-session doesn't
// discard files that were picked but not yet categorized — the account
// holder's explicit request after losing an in-progress sort more than once.
export type UnsortedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "waiting" | "uploading" | "error";
  errorMessage?: string;
  targetRoomId?: string;
  targetWorkTypeId?: string;
  // Mobile-only: a photo added to one bin via MobileSwipeCard stays in the
  // tray (unlike the desktop drag path, which removes it) so it can be
  // added to further bins too — this tracks which (room, work type)
  // combinations it's already been added to.
  confirmedFor: Array<{ roomId: string; workTypeId: string }>;
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function BulkUploadWorkspace({ rooms, workTypes }: { rooms: Room[]; workTypes: WorkType[] }) {
  const [date, setDate] = useState(todayIsoLocal());
  const [files, setFiles] = useState<UnsortedFile[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id ?? "");

  const [binCounts, setBinCounts] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore the date and any not-yet-sorted files left over from a previous
  // visit (or an interrupted one) as soon as the page mounts.
  useEffect(() => {
    const storedDate = localStorage.getItem(UPLOAD_DATE_STORAGE_KEY);
    if (storedDate) setDate(storedDate);

    loadAllTrayFiles()
      .then((stored) => {
        if (stored.length === 0) return;
        const restored: UnsortedFile[] = stored
          .sort((a, b) => a.addedAt - b.addedAt)
          .map(({ id, file, confirmedFor }) => ({
            id,
            file,
            previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
            status: "waiting",
            confirmedFor,
          }));
        setFiles((prev) => [...prev, ...restored]);
        toast.success(`กู้คืนไฟล์ที่ยังไม่ได้จัดหมวด ${restored.length} ไฟล์`);
      })
      .catch(() => {
        // Best-effort restore — if IndexedDB is unavailable (private
        // browsing, storage disabled), the page still works, it just can't
        // survive a refresh, same as before this feature existed.
      });
  }, []);

  function handleDateChange(next: string) {
    setDate(next);
    localStorage.setItem(UPLOAD_DATE_STORAGE_KEY, next);
  }

  function addFiles(fileList: FileList | File[]) {
    const newItems: UnsortedFile[] = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
      status: "waiting",
      confirmedFor: [],
    }));
    if (newItems.length === 0) return;
    setFiles((prev) => [...prev, ...newItems]);
    const addedAt = Date.now();
    for (const item of newItems) {
      void saveTrayFile({ id: item.id, file: item.file, confirmedFor: [], addedAt });
    }
  }

  function removeFiles(ids: Set<string>) {
    setFiles((prev) => {
      for (const item of prev) {
        if (ids.has(item.id) && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((item) => !ids.has(item.id));
    });
    for (const id of ids) {
      void deleteTrayFile(id);
    }
  }

  // Discards a file the user decided not to sort after all — never uploaded,
  // so this is just removing it from the tray (same cleanup as a successful
  // assignment: revoke its object URL, drop it from state).
  function removeFile(fileId: string) {
    removeFiles(new Set([fileId]));
  }

  // Lets one photo end up in more than one room/work-type on desktop too —
  // duplicate it in the tray (its own independent object URL, so revoking
  // one copy's preview never breaks the other's), then drag each copy to a
  // different bin like any other file.
  function duplicateFile(fileId: string) {
    setFiles((prev) => {
      const index = prev.findIndex((f) => f.id === fileId);
      if (index === -1) return prev;
      const original = prev[index];
      const copy: UnsortedFile = {
        id: crypto.randomUUID(),
        file: original.file,
        previewUrl: isImageFile(original.file) ? URL.createObjectURL(original.file) : null,
        status: "waiting",
        confirmedFor: [],
      };
      void saveTrayFile({ id: copy.id, file: copy.file, confirmedFor: [], addedAt: Date.now() });
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  // Desktop drag path — assigns to exactly one (room, work type) and, on
  // success, removes the file(s) from the tray entirely (spec.md's "leaves
  // the unsorted tray" behavior for the single-destination drag gesture).
  // No async "resolve a container" step — the date is already known
  // synchronously, so this uploads directly (specs/018-per-photo-dates).
  async function assignFiles(targets: UnsortedFile[], roomId: string, workTypeId: string) {
    if (!date) {
      toast.error("กรุณาเลือกวันที่ก่อน");
      return;
    }
    if (targets.length === 0) return;

    const ids = new Set(targets.map((t) => t.id));
    setFiles((prev) =>
      prev.map((f) =>
        ids.has(f.id)
          ? { ...f, status: "uploading", targetRoomId: roomId, targetWorkTypeId: workTypeId, errorMessage: undefined }
          : f
      )
    );

    // Chunk at uploadPhoto's existing per-call limit (research.md Decision 4)
    // while keeping each chunk's UnsortedFile ids paired to their File, so
    // per-file results map back to the right tray chip.
    for (let i = 0; i < targets.length; i += MAX_BATCH_FILES) {
      const chunk = targets.slice(i, i + MAX_BATCH_FILES);
      const result = await uploadPhoto(roomId, workTypeId, date, chunk.map((t) => t.file));

      if (!result.ok) {
        setFiles((prev) =>
          prev.map((f) => (chunk.some((c) => c.id === f.id) ? { ...f, status: "error", errorMessage: result.error } : f))
        );
        continue;
      }

      const succeededIds = new Set<string>();
      const failures = new Map<string, string>();
      result.data.results.forEach((r, idx) => {
        const item = chunk[idx];
        if (r.success) succeededIds.add(item.id);
        else failures.set(item.id, r.error);
      });

      if (succeededIds.size > 0) {
        removeFiles(succeededIds);
        setBinCounts((prev) => ({
          ...prev,
          [`${roomId}::${workTypeId}`]: (prev[`${roomId}::${workTypeId}`] ?? 0) + succeededIds.size,
        }));
      }
      if (failures.size > 0) {
        setFiles((prev) =>
          prev.map((f) => (failures.has(f.id) ? { ...f, status: "error", errorMessage: failures.get(f.id) } : f))
        );
      }
    }
  }

  // Mobile swipe-card path — adds one file to one (room, work type) bin
  // without removing it from the tray, so the same photo can be added to
  // further bins later (the account holder's "1 photo, several categories"
  // requirement). Navigating cards never calls this — only the explicit
  // "add" action does.
  async function assignFileKeepInTray(target: UnsortedFile, roomId: string, workTypeId: string) {
    if (!date) {
      toast.error("กรุณาเลือกวันที่ก่อน");
      return;
    }
    if (target.confirmedFor.some((c) => c.roomId === roomId && c.workTypeId === workTypeId)) {
      toast.error("เพิ่มรูปนี้เข้าหมวดนี้ไปแล้ว");
      return;
    }

    setFiles((prev) =>
      prev.map((f) => (f.id === target.id ? { ...f, status: "uploading", errorMessage: undefined } : f))
    );

    const result = await uploadPhoto(roomId, workTypeId, date, [target.file]);

    if (!result.ok) {
      setFiles((prev) =>
        prev.map((f) => (f.id === target.id ? { ...f, status: "error", errorMessage: result.error } : f))
      );
      return;
    }

    const single = result.data.results[0];
    if (!single?.success) {
      setFiles((prev) =>
        prev.map((f) => (f.id === target.id ? { ...f, status: "error", errorMessage: single?.error } : f))
      );
      return;
    }

    const nextConfirmedFor = [...target.confirmedFor, { roomId, workTypeId }];
    setFiles((prev) =>
      prev.map((f) => (f.id === target.id ? { ...f, status: "waiting", confirmedFor: nextConfirmedFor } : f))
    );
    void saveTrayFile({ id: target.id, file: target.file, confirmedFor: nextConfirmedFor, addedAt: Date.now() });
    setBinCounts((prev) => ({
      ...prev,
      [`${roomId}::${workTypeId}`]: (prev[`${roomId}::${workTypeId}`] ?? 0) + 1,
    }));
    toast.success("เพิ่มรูปเข้าหมวดแล้ว");
  }

  function handleDropOnBin(fileIds: string[], workTypeId: string) {
    const ids = new Set(fileIds);
    const targets = files.filter((f) => ids.has(f.id));
    if (targets.length === 0) return;
    void assignFiles(targets, activeRoomId, workTypeId);
  }

  function handleRetry(fileId: string) {
    const target = files.find((f) => f.id === fileId);
    if (!target || !target.targetRoomId || !target.targetWorkTypeId) return;
    void assignFiles([target], target.targetRoomId, target.targetWorkTypeId);
  }

  return (
    <div className="flex flex-col gap-5">
      <UploadDatePicker date={date} onChange={handleDateChange} />

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={PHOTO_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (e.dataTransfer.files.length > 0) {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }
          }}
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground"
        >
          <p>ลากไฟล์มาวางที่นี่ หรือ</p>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            เลือกไฟล์
          </Button>
        </div>
      </div>

      {/* Phone: one-at-a-time swipe-card review (components/MobileSwipeCard.tsx) —
          a photo can be added to several room/work-type bins without leaving
          the tray. Tablet/desktop keep the original grid-tray + drag UI. */}
      <div className="md:hidden">
        <MobileSwipeCard
          files={files}
          rooms={rooms}
          workTypes={workTypes}
          onAssignFile={assignFileKeepInTray}
          onRemove={removeFile}
          onDuplicate={duplicateFile}
        />
      </div>

      <div className="hidden md:block">
        {/* Tray on the left, room/work-type selection on the right (sticky) —
            a long tray of many files no longer pushes the bins off-screen,
            per live feedback from the account holder. */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <UnsortedFileTray
            files={files}
            onRetry={handleRetry}
            onDuplicate={duplicateFile}
            onRemove={removeFile}
          />

          <div className="flex flex-col gap-4 lg:sticky lg:top-20">
            <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">ห้อง</p>
              <RoomTabBar rooms={rooms} activeRoomId={activeRoomId} onSelectRoom={setActiveRoomId} />
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">หมวดงาน</p>
              <WorkTypeBinGrid
                workTypes={workTypes}
                binCounts={binCounts}
                activeRoomId={activeRoomId}
                onDropFiles={handleDropOnBin}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
