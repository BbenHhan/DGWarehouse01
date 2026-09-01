"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Film, Image as ImageIcon, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { uploadDoc } from "@/app/actions/documents";
import { fileKindFromName } from "@/lib/file-kind";
import { suggestGroups, type Suggestion } from "@/lib/document-suggest";
import { extractPdfText } from "@/lib/pdf-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

// The same sort-into-bins workflow the photo bulk uploader has: drop a pile of
// files into a tray, then drag each one onto the sub-group it belongs to, which
// uploads it straight away.
//
// Written separately rather than reusing components/UnsortedFileTray.tsx: that
// tray's file records carry room/work-type targets, image previews, and the
// mobile "already added to these bins" list, none of which mean anything here.
// Generalising it would put a working photo flow at risk for nothing a user
// would ever see.
//
// The bins differ in one way that matters. A room has 7 work types, which fit a
// 2-column grid; a document category can have 25 sub-groups — หมวดที่ 4 does —
// and a 13-row grid means scrolling while dragging, which is miserable. So the
// bins are a compact vertical list with a filter box instead. They are NOT
// reordered by how full they are: the order is the one an editor deliberately
// set in management mode, and quietly overriding it would undo that work.
type TrayFile = {
  id: string;
  file: File;
  // A blob URL for the file sitting in the browser. Created when the file
  // enters the tray and revoked when it leaves, so nothing is left dangling.
  previewUrl: string;
  status: "waiting" | "uploading" | "error";
  errorMessage?: string;
  /** Text read out of the file in the browser, when there was any. */
  scannedText?: string;
  /** "scanning" while pdf.js is reading; "done" once there is nothing more to learn. */
  scanState: "pending" | "scanning" | "done";
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Files here have not been uploaded, so there is no backend URL to point
// next/image at (Constitution III's rule is about rendering stored files) —
// these render straight from the blob the browser already holds.
function TrayPreview({ entry }: { entry: TrayFile }) {
  const kind = fileKindFromName(entry.file.name);

  if (kind === "image") {
    return (
      // A blob: URL for a file that has not been uploaded; next/image cannot
      // load one, which is why this is a plain img.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.previewUrl}
        alt={entry.file.name}
        className="max-h-72 w-full rounded-lg bg-secondary/50 object-contain"
      />
    );
  }

  if (kind === "video") {
    return <video src={entry.previewUrl} controls className="max-h-72 w-full rounded-lg bg-black" />;
  }

  if (kind === "pdf") {
    return (
      // See the matching note in components/DocList.tsx: an <iframe> gives a
      // blank rectangle and no escape when the browser would rather download a
      // PDF than display it, which is a setting many people have on.
      <object
        data={entry.previewUrl}
        type="application/pdf"
        aria-label={entry.file.name}
        className="h-[60vh] w-full rounded-lg border border-border/60"
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-60" />
          <p>เบราว์เซอร์นี้แสดง PDF ในหน้าเว็บไม่ได้</p>
          <a
            href={entry.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            เปิดในแท็บใหม่
          </a>
        </div>
      </object>
    );
  }

  // Word and Excel files cannot be shown inline. Saying so, with the details
  // that are actually known, beats an empty panel that looks broken.
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
      <FileText className="h-8 w-8 opacity-60" />
      <p>ไฟล์ชนิดนี้ดูตัวอย่างในหน้าเว็บไม่ได้</p>
      <a
        href={entry.previewUrl}
        download={entry.file.name}
        className="text-primary underline underline-offset-2"
      >
        เปิดด้วยโปรแกรมในเครื่อง
      </a>
    </div>
  );
}

function KindIcon({ fileName }: { fileName: string }) {
  const kind = fileKindFromName(fileName);
  const className = "h-4 w-4 shrink-0 text-muted-foreground";
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "video") return <Film className={className} />;
  return <FileText className={className} />;
}

// Suggestions, never automatic filing. Measured against the account holder's
// own 33 filed documents, the top suggestion is right about 39% of the time on
// the file name alone and wrong about 15% — and a document silently misfiled in
// a folder bound for a Department of Industrial Works inspection costs far more
// than a click. So this offers up to three candidates and the person picks.
function SuggestionRow({
  entry,
  groups,
  categories,
  onPick,
}: {
  entry: TrayFile;
  groups: DocumentGroup[];
  categories: DocumentCategory[];
  onPick: (group: DocumentGroup) => void;
}) {
  if (entry.status === "uploading") return null;

  if (entry.scanState === "scanning") {
    return (
      <p className="px-2.5 pb-2 text-xs text-muted-foreground">กำลังอ่านเนื้อหาไฟล์...</p>
    );
  }

  const suggestions = suggestGroups({
    fileName: entry.file.name,
    text: entry.scannedText,
    groups,
    categories,
  });

  // Saying nothing is the honest outcome for a camera file name like
  // IMG_9769.JPG — a guess with no evidence behind it would be worse than
  // silence.
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2">
      <span className="text-xs text-muted-foreground">น่าจะเป็น:</span>
      {suggestions.map((suggestion: Suggestion) => (
        <button
          key={suggestion.group.id}
          type="button"
          onClick={() => onPick(suggestion.group)}
          title={`ตรงกับคำว่า ${suggestion.matched.join(", ")}`}
          className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/15"
        >
          {suggestion.category?.emoji} {suggestion.group.name_th}
        </button>
      ))}
    </div>
  );
}

export function DocumentUploadWorkspace({
  categories,
  groups,
}: {
  categories: DocumentCategory[];
  groups: DocumentGroup[];
}) {
  const [files, setFiles] = useState<TrayFile[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedCounts, setUploadedCounts] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const bins = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return groups
      .filter((group) => group.category_id === activeCategoryId)
      .filter((group) => !term || group.name_th.toLowerCase().includes(term))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [groups, activeCategoryId, filter]);

  const waiting = files.filter((entry) => entry.status !== "uploading");

  function addFiles(incoming: FileList | File[]) {
    const added = Array.from(incoming).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "waiting" as const,
      scanState: (fileKindFromName(file.name) === "pdf" ? "pending" : "done") as TrayFile["scanState"],
    }));
    setFiles((current) => [...current, ...added]);

    // Reading happens per file and off the main path, so a big PDF never holds
    // up the rest of the tray appearing.
    for (const entry of added) {
      if (entry.scanState !== "pending") continue;
      setFiles((current) =>
        current.map((row) => (row.id === entry.id ? { ...row, scanState: "scanning" } : row))
      );
      void extractPdfText(entry.file).then((text) => {
        setFiles((current) =>
          current.map((row) =>
            row.id === entry.id ? { ...row, scannedText: text, scanState: "done" } : row
          )
        );
      });
    }
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const removed = current.find((entry) => entry.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }

  // Uploading straight on drop, rather than collecting assignments and sending
  // them at the end, matches the photo flow — and means a half-finished sort
  // still leaves everything already filed actually filed.
  async function assign(ids: string[], group: DocumentGroup) {
    const targets = files.filter((entry) => ids.includes(entry.id));
    if (targets.length === 0) return;

    setFiles((current) =>
      current.map((entry) => (ids.includes(entry.id) ? { ...entry, status: "uploading" } : entry))
    );

    const result = await uploadDoc(
      group.category_id,
      group.name_th,
      targets.map((entry) => entry.file)
    );

    if (!result.ok) {
      toast.error(result.error);
      setFiles((current) =>
        current.map((entry) =>
          ids.includes(entry.id) ? { ...entry, status: "error", errorMessage: result.error } : entry
        )
      );
      return;
    }

    const failed = new Map(
      result.data.results.filter((row) => !row.success).map((row) => [row.fileName, row.error ?? "อัปโหลดไม่สำเร็จ"])
    );
    const succeeded = targets.filter((entry) => !failed.has(entry.file.name));

    if (succeeded.length > 0) {
      toast.success(`อัปโหลด ${succeeded.length} ไฟล์เข้า "${group.name_th}" แล้ว`);
      setUploadedCounts((current) => ({
        ...current,
        [group.id]: (current[group.id] ?? 0) + succeeded.length,
      }));
    }

    // A file that failed stays in the tray carrying its reason, so it can be
    // dropped again once the problem is fixed rather than silently vanishing.
    for (const entry of succeeded) URL.revokeObjectURL(entry.previewUrl);
    setFiles((current) =>
      current
        .filter((entry) => !(ids.includes(entry.id) && !failed.has(entry.file.name)))
        .map((entry) =>
          failed.has(entry.file.name)
            ? { ...entry, status: "error", errorMessage: failed.get(entry.file.name) }
            : entry
        )
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="application/pdf,image/*,video/mp4,video/quicktime,video/webm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        data-testid="workspace-drop-zone"
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          if (event.dataTransfer.files.length === 0) return;
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={[
          "flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm transition-colors",
          isDragging ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card/30 text-muted-foreground",
        ].join(" ")}
      >
        <p>{isDragging ? "วางไฟล์เพื่อเพิ่มลงถาด" : "ลากไฟล์มาวางที่นี่ หรือ"}</p>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          เลือกไฟล์
        </Button>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            ไฟล์ที่ยังไม่ได้จัด {waiting.length > 0 && `(${waiting.length})`}
          </p>
          {files.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีไฟล์ในถาด
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {files.map((entry) => (
                <li
                  key={entry.id}
                  draggable={entry.status !== "uploading"}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", entry.id)}
                  data-testid="tray-file"
                  className={[
                    "rounded-xl border text-sm",
                    entry.status === "error" ? "border-destructive/50 bg-destructive/5" : "border-border bg-card",
                    entry.status === "uploading" ? "opacity-60" : "cursor-grab",
                  ].join(" ")}
                >
                  {/* A file name alone often is not enough to know where it
                      belongs — "scan_0142.pdf" tells you nothing. Expanding
                      shows the file itself, straight from the browser, before
                      it is filed anywhere. */}
                  <Collapsible>
                    <div className="flex items-center gap-2 p-2.5">
                      <KindIcon fileName={entry.file.name} />
                      <CollapsibleTrigger
                        className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-label={`ดูเนื้อหา ${entry.file.name}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{entry.file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatSize(entry.file.size)}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                      </CollapsibleTrigger>
                      {entry.status === "uploading" && (
                        <span className="shrink-0 text-xs text-muted-foreground">กำลังอัปโหลด...</span>
                      )}
                      {entry.status === "error" && (
                        <>
                          <span className="shrink-0 text-xs text-destructive">{entry.errorMessage}</span>
                          <RotateCcw className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </>
                      )}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`เอา ${entry.file.name} ออกจากถาด`}
                        onClick={() => removeFile(entry.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <SuggestionRow
                      entry={entry}
                      groups={groups}
                      categories={categories}
                      onPick={(group) => void assign([entry.id], group)}
                    />

                    <CollapsibleContent className="overflow-hidden data-ending-style:h-0 data-starting-style:h-0">
                      <div className="flex flex-col gap-2 border-t border-border/60 p-2.5">
                        {/* Always present, whatever the embedded preview does —
                            so a browser that refuses to render inline never
                            leaves the file unviewable. */}
                        <a
                          href={entry.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="self-start text-xs text-primary underline underline-offset-2"
                        >
                          เปิดไฟล์ในแท็บใหม่
                        </a>
                        <TrayPreview entry={entry} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <nav className="scroll-thin flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-all",
                  category.id === activeCategoryId
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                ].join(" ")}
              >
                <span className="text-base leading-none">{category.emoji}</span>
                {category.name_th}
              </button>
            ))}
          </nav>

          {/* 25 bins is too many to scan by eye while holding a dragged file. */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="กรองหมวดย่อย เช่น 4.1"
              aria-label="กรองหมวดย่อย"
              className="h-9 pl-8 text-sm"
            />
          </div>

          <div className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto scroll-thin">
            {bins.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                {filter.trim() ? "ไม่พบหมวดย่อยที่ตรงกับคำค้น" : "หมวดนี้ยังไม่มีหมวดย่อย"}
              </p>
            ) : (
              bins.map((group) => (
                <div
                  key={group.id}
                  data-testid={`bin-${group.id}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData("text/plain");
                    if (id) void assign([id], group);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-sm transition-colors hover:border-primary/50"
                >
                  <span className="min-w-0 flex-1 truncate">{group.name_th}</span>
                  <span className="shrink-0 text-xs text-primary">
                    {group.document_count + (uploadedCounts[group.id] ?? 0)} ไฟล์
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
