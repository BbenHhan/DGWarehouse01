"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadDoc } from "@/app/actions/documents";

type CategoryOption = { value: string; label: string };

// Category + group (note) selection at upload time (specs/025-document-
// upload-categorization) — previously every upload silently went to
// whichever category page it was opened from, with no way to set the
// sub-folder-style `note` grouping Feature 019's dropdown UI and Feature
// 017's bulk import both already rely on.
export function DocUploader({
  categoryId,
  categoryOptions,
  existingNotes,
}: {
  categoryId: string;
  categoryOptions: CategoryOption[];
  existingNotes: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    startTransition(async () => {
      const result = await uploadDoc(selectedCategoryId, note.trim() || null, files);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const succeeded = result.data.results.filter((r) => r.success);
      const failed = result.data.results.filter((r) => !r.success);

      if (succeeded.length > 0) {
        toast.success(`อัปโหลดสำเร็จ ${succeeded.length} ไฟล์`);
      }
      failed.forEach((f) => toast.error(`${f.fileName}: ${f.error}`));

      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card/40 p-3">
      <div className="flex flex-wrap gap-2">
        {categoryOptions.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="doc-upload-category">
              หมวด
            </label>
            <Select value={selectedCategoryId} onValueChange={(value) => value !== null && setSelectedCategoryId(value)}>
              <SelectTrigger id="doc-upload-category" className="w-fit min-w-[180px]">
                <SelectValue>
                  {(value: string | null) =>
                    categoryOptions.find((option) => option.value === value)?.label ?? "เลือกหมวด..."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="doc-upload-note">
            หมวดย่อย/กลุ่ม (ไม่บังคับ)
          </label>
          <Input
            id="doc-upload-note"
            list="doc-upload-note-suggestions"
            placeholder="เช่น แปลนและแบบก่อสร้าง"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-fit min-w-[220px]"
          />
          <datalist id="doc-upload-note-suggestions">
            {existingNotes.map((existingNote) => (
              <option key={existingNote} value={existingNote} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*,video/mp4,video/quicktime,video/webm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
          {isPending ? "กำลังอัปโหลด..." : "+ เพิ่มไฟล์"}
        </Button>
      </div>
    </div>
  );
}
