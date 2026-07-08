"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { FileText, ImageOff, Play, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";
import { fileKindFromName } from "@/lib/file-kind";
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

type WeekMoveOption = { value: string; label: string };

// Real photo dimensions aren't stored, so a true masonry needs a stand-in:
// derive a stable pseudo-random aspect ratio per photo (from its id) rather
// than forcing every tile into the same square, which is what made the grid
// feel flat/repetitive.
const ASPECT_RATIOS = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[4/3]"];
function aspectRatioFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ASPECT_RATIOS[hash % ASPECT_RATIOS.length];
}

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
      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

export function PhotoGrid({
  photos,
  weekMoveOptions,
}: {
  photos: Photo[];
  weekMoveOptions: WeekMoveOption[];
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
        <p className="font-medium">ยังไม่มีไฟล์ในสัปดาห์นี้</p>
        {!USE_MOCK_DATA && <p className="text-sm">อัปโหลดรูป/PDF/วิดีโอแรกของคุณด้านล่าง</p>}
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
        {optimisticPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={[
              "group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-shadow hover:shadow-md",
              aspectRatioFor(photo.id),
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="absolute inset-0"
              aria-label={`เปิดไฟล์ ${photo.file_name}`}
            >
              <PhotoTileMedia photo={photo} />
              <span className="pointer-events-none absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="truncate text-[11px] text-white/90">{photo.file_name}</span>
                <Search className="h-3.5 w-3.5 shrink-0 text-white/80" />
              </span>
            </button>

            {!USE_MOCK_DATA && (
              <div className="absolute top-1 right-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                <EditModal
                  kind="photo"
                  item={photo}
                  moveOptions={weekMoveOptions}
                  moveLabel="ย้ายไปสัปดาห์"
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
                      <AlertDialogAction onClick={() => handleDelete(photo.id)}>ลบ</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
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
