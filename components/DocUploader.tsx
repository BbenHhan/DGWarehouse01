"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompletePopup,
  AutocompleteTrigger,
} from "@/components/ui/autocomplete";
import { uploadDoc } from "@/app/actions/documents";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";
import { useManageMode } from "@/components/ManageModeProvider";
import { groupLabel } from "@/lib/taxonomy-label";

// Group (note) selection at upload time (specs/025-document-upload-
// categorization) — previously every upload silently went to whichever
// category page it was opened from, with no way to set the sub-folder-style
// `note` grouping Feature 019's dropdown UI and Feature 017's bulk import
// both already rely on. A category picker used to live here too, but the
// account holder pointed out it was always redundant — the category is
// already implied by which page's tab you're on (specs/039-doc-uploader-
// category-picker-removal) — so uploads always go to `categoryId`, the
// current page's own category.
export function DocUploader({
  categoryId,
  groups,
  category,
}: {
  categoryId: string;
  groups: DocumentGroup[];
  category: DocumentCategory;
}) {
  const { managing } = useManageMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  // Every group in THIS category, whether or not it holds files — the two
  // things the old note-scanning suggestion list could not do
  // (specs/040-editable-document-taxonomy, FR-023).
  // Numbered for reading; uploadDoc strips the number back off before it
  // resolves the group, so picking "1.2 งานผนัง" lands in "งานผนัง" rather than
  // creating a second group under the numbered name.
  const groupNames = groups.map((group) => groupLabel(group, category.sort_order));
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    startTransition(async () => {
      const result = await uploadDoc(categoryId, note.trim() || null, files);

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

      // Clearing it means picking the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  // Adding files and reshaping the taxonomy are different jobs, and the upload
  // box sitting between the tabs and the sub-group list was noise during the
  // second one.
  if (managing) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card/40 p-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="doc-upload-note">
            หมวดย่อย/กลุ่ม (ไม่บังคับ)
          </label>
          {/* Free-text with styled suggestions (specs/035-select-dropdown-
              polish) — replaces a native <input list>/<datalist> pair, whose
              suggestion popup is browser-native and can't be styled at all.
              Typing a value not in this category's groups is still accepted
              (specs/025-document-upload-categorization's whole point). */}
          <Autocomplete items={groupNames} value={note} onValueChange={setNote} openOnInputClick>
            <AutocompleteInputGroup>
              <AutocompleteInput
                id="doc-upload-note"
                placeholder="เช่น แปลนและแบบก่อสร้าง"
                className="w-fit min-w-[220px]"
              />
              <AutocompleteTrigger aria-label="แสดงกลุ่มที่เคยใช้" />
            </AutocompleteInputGroup>
            <AutocompletePopup>
              {(existingNote: string) => (
                <AutocompleteItem key={existingNote} value={existingNote}>
                  {existingNote}
                </AutocompleteItem>
              )}
            </AutocompletePopup>
          </Autocomplete>
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
        {/* Same drop-zone shape the photo bulk uploader already uses
            (components/BulkUploadWorkspace.tsx) rather than a second pattern —
            dragging files in works the same way in both modules, and the button
            stays for phones, where there is nothing to drag from. */}
        <div
          data-testid="doc-drop-zone"
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            // Without preventDefault the browser navigates to the dropped file
            // instead of letting the page handle it.
            event.preventDefault();
            if (!isPending) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            if (event.dataTransfer.files.length === 0) return;
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={[
            "flex flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center text-sm transition-colors",
            isDragging ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card/30 text-muted-foreground",
          ].join(" ")}
        >
          <p>{isDragging ? "วางไฟล์เพื่ออัปโหลด" : "ลากไฟล์มาวางที่นี่ หรือ"}</p>
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
    </div>
  );
}
