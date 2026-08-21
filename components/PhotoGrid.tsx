"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { FileText, ImageOff, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";
import { fileKindFromName } from "@/lib/file-kind";
import { formatThaiDate } from "@/lib/date-format";
import { Lightbox } from "@/components/Lightbox";
import { Button } from "@/components/ui/button";
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
import { deletePhoto } from "@/app/actions/photos";
import { EditModal } from "@/components/EditModal";
import { USE_MOCK_DATA } from "@/lib/data-config";

type MoveOption = { value: string; label: string };

// Photos module now accepts image/PDF/video (Constitution VIII), so a tile
// can't assume next/image works — video gets a muted preview clip, PDF gets
// an icon card, since neither has a thumbnail to point <Image> at.
function PhotoTileMedia({ photo }: { photo: Photo }) {
  const kind = fileKindFromName(photo.file_name);
  const src = publicFileUrl("photos", photo.storage_path);

  if (kind === "video") {
    return (
      <>
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="h-4 w-4 fill-current" />
          </span>
        </span>
      </>
    );
  }

  if (kind === "pdf" || kind === "other") {
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary p-3 text-secondary-foreground">
        <FileText className="h-8 w-8 opacity-70" />
        <span className="line-clamp-2 text-center text-[11px] break-all opacity-80">
          {photo.file_name}
        </span>
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={photo.file_name}
      fill
      sizes="220px"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function PhotoTile({
  photo,
  onOpen,
  canEdit,
  moveOptions,
  onDelete,
}: {
  photo: Photo;
  onOpen: () => void;
  canEdit: boolean;
  moveOptions: MoveOption[];
  onDelete: (photoId: string) => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0"
        aria-label={`เปิดไฟล์ ${photo.file_name}`}
      >
        <PhotoTileMedia photo={photo} />
        <span className="pointer-events-none absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="truncate text-[11px] text-white/90">{photo.file_name}</span>
          <Search className="h-3.5 w-3.5 shrink-0 text-white/80" />
        </span>
      </button>

      {!USE_MOCK_DATA && canEdit && (
        <div className="absolute top-1 right-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <EditModal
            kind="photo"
            item={photo}
            moveOptions={moveOptions}
            moveLabel="ย้ายไปห้อง/หมวดงาน"
          />

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  aria-label={`ลบรูป ${photo.file_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ลบรูปภาพนี้?</AlertDialogTitle>
                <AlertDialogDescription>
                  การลบนี้ไม่สามารถย้อนกลับได้ รูปภาพจะถูกลบออกทันที
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(photo.id)}>ลบ</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// Groups an already date-sorted photo list into consecutive same-date runs —
// a single pass, not a re-sort, since getPhotos/localGetPhotos/mockGetPhotos
// all already order by date (specs/018-per-photo-dates).
function groupByDate(photos: Photo[]): Array<{ date: string; photos: Photo[] }> {
  const groups: Array<{ date: string; photos: Photo[] }> = [];
  for (const photo of photos) {
    const last = groups[groups.length - 1];
    if (last && last.date === photo.date) {
      last.photos.push(photo);
    } else {
      groups.push({ date: photo.date, photos: [photo] });
    }
  }
  return groups;
}

export function PhotoGrid({
  photos,
  moveOptions,
  canEdit,
}: {
  photos: Photo[];
  moveOptions: MoveOption[];
  canEdit: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [optimisticPhotos, removeOptimisticPhoto] = useOptimistic(
    photos,
    (state, photoId: string) => state.filter((photo) => photo.id !== photoId)
  );

  function handleDelete(photoId: string) {
    startTransition(async () => {
      removeOptimisticPhoto(photoId);
      const result = await deletePhoto(photoId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  if (optimisticPhotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
        <ImageOff className="h-8 w-8 opacity-50" />
        <p className="font-medium">ยังไม่มีไฟล์</p>
        {!USE_MOCK_DATA && canEdit && <p className="text-sm">ไปที่หน้าอัปโหลดรูปหลายไฟล์เพื่อเพิ่มไฟล์แรก</p>}
      </div>
    );
  }

  // Horizontal date timeline — the room/work-type page's default view, per
  // the account holder's explicit request: scroll sideways along dates
  // rather than a plain masonry grid, leftmost = most recent (matching
  // FR-003's "most recent first", already the order `photos` arrives in).
  const groups = groupByDate(optimisticPhotos);
  let runningIndex = 0;

  return (
    <>
      <div className="scroll-thin flex gap-4 overflow-x-auto pb-4">
        {groups.map((group) => {
          const columnStartIndex = runningIndex;
          runningIndex += group.photos.length;
          return (
            <div key={group.date} className="flex w-[220px] shrink-0 flex-col gap-2">
              <div className="rounded-full border border-border bg-card px-3 py-1 text-center text-sm font-medium whitespace-nowrap text-foreground">
                {formatThaiDate(group.date) ?? group.date}
                <span className="ml-1 text-xs text-muted-foreground">· {group.photos.length} ไฟล์</span>
              </div>
              <div className="flex flex-col gap-2">
                {group.photos.map((photo, i) => (
                  <PhotoTile
                    key={photo.id}
                    photo={photo}
                    onOpen={() => setOpenIndex(columnStartIndex + i)}
                    canEdit={canEdit}
                    moveOptions={moveOptions}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {openIndex !== null && (
        <Lightbox
          photos={optimisticPhotos}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
