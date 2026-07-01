"use client";

import { useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";
import { Lightbox } from "@/components/Lightbox";

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
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
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="relative aspect-square overflow-hidden rounded-md bg-muted"
          >
            <Image
              src={publicFileUrl("photos", photo.storage_path)}
              alt={photo.file_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <Lightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
