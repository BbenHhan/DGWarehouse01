"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";
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
        <p className="font-medium">ยังไม่มีรูปภาพในสัปดาห์นี้</p>
        {!USE_MOCK_DATA && <p className="text-sm">อัปโหลดรูปภาพแรกของคุณด้านล่าง</p>}
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {optimisticPhotos.length} รูปภาพ
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {optimisticPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="absolute inset-0"
              aria-label={`เปิดรูป ${photo.file_name}`}
            >
              <Image
                src={publicFileUrl("photos", photo.storage_path)}
                alt={photo.file_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1.5 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {photo.file_name}
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
