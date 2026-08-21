"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, RefreshCw, Trash2, Video } from "lucide-react";
import type { Room, WorkType } from "@/lib/types";
import type { UnsortedFile } from "@/components/BulkUploadWorkspace";
import { groupRooms } from "@/lib/room-groups";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Phone-only one-at-a-time review flow, replacing tap-select + bottom sheet
// (specs/015-multi-upload-drag-sort, revised after live feedback — the
// account holder wanted large, legible photos on mobile, one at a time,
// closer to a card-review pattern than a small-thumbnail grid).
//
// Swiping/navigating between cards never assigns anything — the room/work
// type choice below the card is "sticky" (carries over as you browse) so a
// run of similar photos doesn't need re-selecting every time, but nothing
// is added until "เพิ่มรูปนี้เข้าห้อง/หมวดนี้" is pressed. Pressing it does
// NOT advance to the next card and does NOT remove the photo from the
// list — the same photo can be added to more than one room/work-type this
// way (spec.md User Story 4 amendment), and the account holder navigates
// on their own terms via swipe or the arrow buttons.
export function MobileSwipeCard({
  files,
  rooms,
  workTypes,
  onAssignFile,
  onRemove,
  onDuplicate,
}: {
  files: UnsortedFile[];
  rooms: Room[];
  workTypes: WorkType[];
  onAssignFile: (file: UnsortedFile, roomId: string, workTypeId: string) => void;
  onRemove: (fileId: string) => void;
  onDuplicate: (fileId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id ?? "");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState(workTypes[0]?.id ?? "");
  const dragStartX = useRef<number | null>(null);
  const roomGroups = groupRooms(rooms);

  const clampedIndex = Math.min(index, Math.max(0, files.length - 1));
  useEffect(() => {
    if (index !== clampedIndex) setIndex(clampedIndex);
  }, [index, clampedIndex]);

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
        ยังไม่มีไฟล์ — เพิ่มไฟล์ด้านบนเพื่อเริ่มจัดหมวดหมู่
      </div>
    );
  }

  const current = files[clampedIndex];

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(files.length - 1, next)));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          รูปที่ {clampedIndex + 1} / {files.length}
        </span>
        <span className={current.confirmedFor.length > 0 ? "text-primary" : undefined}>
          {current.confirmedFor.length === 0 ? "ยังไม่ระบุหมวดหมู่" : `เพิ่มแล้ว ${current.confirmedFor.length} หมวด`}
        </span>
      </div>

      <div
        onPointerDown={(e) => {
          dragStartX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (dragStartX.current === null) return;
          const dx = e.clientX - dragStartX.current;
          dragStartX.current = null;
          if (dx < -40) goTo(clampedIndex + 1);
          else if (dx > 40) goTo(clampedIndex - 1);
        }}
        className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-card"
      >
        {current.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- transient client-side object URL preview, not the final stored photo
          <img src={current.previewUrl} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <Video className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        )}

        {current.status === "uploading" && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm">
            กำลังอัปโหลด...
          </span>
        )}
      </div>

      {current.status === "error" && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <p className="line-clamp-2 text-xs text-destructive">{current.errorMessage}</p>
          <button
            type="button"
            onClick={() => onAssignFile(current, selectedRoomId, selectedWorkTypeId)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-destructive px-2 py-1 text-[11px] text-destructive-foreground"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            ลองใหม่
          </button>
        </div>
      )}

      {current.confirmedFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {current.confirmedFor.map((c, i) => {
            const room = rooms.find((r) => r.id === c.roomId);
            const workType = workTypes.find((w) => w.id === c.workTypeId);
            return (
              <span
                key={i}
                className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] text-primary"
              >
                {room?.emoji} / {workType?.emoji} {workType?.name_th}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => goTo(clampedIndex - 1)}
          disabled={clampedIndex === 0}
          aria-label="รูปก่อนหน้า"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => goTo(clampedIndex + 1)}
          disabled={clampedIndex === files.length - 1}
          aria-label="รูปถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onDuplicate(current.id)}
          aria-label="ทำสำเนารูปนี้"
          className="ml-2"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={() => onRemove(current.id)}
          aria-label="เอารูปนี้ออก"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-background p-2.5">
        <p className="text-xs text-muted-foreground">ห้อง</p>
        <div className="flex flex-wrap gap-2">
          {roomGroups.map((group) => (
            <div
              key={group.key}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-1.5"
            >
              <p className="flex items-center gap-1 px-1 text-[10px] font-medium text-muted-foreground">
                <span>{group.emoji}</span>
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      room.id === selectedRoomId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {room.name_th}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-background p-2.5">
        <p className="text-xs text-muted-foreground">หมวดงาน</p>
        <div className="grid grid-cols-3 gap-1.5">
          {workTypes.map((workType) => (
            <button
              key={workType.id}
              type="button"
              onClick={() => setSelectedWorkTypeId(workType.id)}
              className={cn(
                "rounded-lg border px-1.5 py-1 text-[11px]",
                workType.id === selectedWorkTypeId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {workType.emoji} {workType.name_th}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        disabled={current.status === "uploading"}
        onClick={() => onAssignFile(current, selectedRoomId, selectedWorkTypeId)}
      >
        เพิ่มรูปนี้เข้าห้อง/หมวดนี้
      </Button>
    </div>
  );
}
