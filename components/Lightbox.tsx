"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";

export function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length]
  );
  const goNext = useCallback(() => setIndex((i) => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between p-4 text-white">
        <span className="truncate text-sm">{photo.file_name}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="rounded-full border border-primary/20 bg-primary/15 p-2 transition-colors hover:bg-primary/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1">
        <Image
          src={publicFileUrl("photos", photo.storage_path)}
          alt={photo.file_name}
          fill
          sizes="100vw"
          className="object-contain drop-shadow-[0_24px_80px_rgba(0,0,0,.7)]"
          priority
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="รูปก่อนหน้า"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-primary/20 bg-primary/10 p-2.5 text-white transition-colors hover:bg-primary/25"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="รูปถัดไป"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-primary/20 bg-primary/10 p-2.5 text-white transition-colors hover:bg-primary/25"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/20 bg-primary/15 px-3.5 py-1 text-xs text-white/90">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
