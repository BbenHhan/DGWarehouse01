"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadDoc } from "@/app/actions/documents";

export function DocUploader({ categoryId }: { categoryId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    startTransition(async () => {
      const result = await uploadDoc(categoryId, files);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const succeeded = result.data.results.filter((r) => r.success);
      const failed = result.data.results.filter((r) => !r.success);

      if (succeeded.length > 0) {
        toast.success(`อัปโหลดสำเร็จ ${succeeded.length} เอกสาร`);
      }
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));

      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={isPending}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? "กำลังอัปโหลด..." : "+ เพิ่มเอกสาร"}
      </Button>
    </div>
  );
}
