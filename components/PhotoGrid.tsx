"use client";

import { useOptimistic, useState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
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

export function PhotoGrid({ photos }: { photos: Photo[] }) {
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
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p>ยังไม่มีรูปภาพในสัปดาห์นี้</p>
        <p className="text-sm">อัปโหลดรูปภาพแรกของคุณด้านล่าง</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {optimisticPhotos.map((photo, index) => (
          <div key={photo.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
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
                className="object-cover"
              />
            </button>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    className="absolute top-1 right-1"
                    onClick={(e) => e.stopPropagation()}
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
