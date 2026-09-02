"use client";

import { useOptimistic, useTransition } from "react";
import Image from "next/image";
import { ChevronDown, Download, ExternalLink, FileText, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Document, DocumentCategory, DocumentGroup } from "@/lib/types";
import { useManageMode } from "@/components/ManageModeProvider";
import { createGroup, moveGroup, renameGroup } from "@/app/actions/document-taxonomy";
import { ReorderButtons } from "@/components/ReorderButtons";
import { DeleteTaxonomyDialog } from "@/components/DeleteTaxonomyDialog";
import { EditableName } from "@/components/EditableName";
import { groupNumber } from "@/lib/taxonomy-label";
import { publicFileUrl } from "@/lib/storage";
import { fileKindFromName } from "@/lib/file-kind";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { deleteDoc } from "@/app/actions/documents";
import { EditModal } from "@/components/EditModal";
import { USE_MOCK_DATA } from "@/lib/data-config";

type CategoryMoveOption = { value: string; label: string };

// Fetches the file as a blob rather than relying on the <a download> attribute,
// since that attribute is ignored by browsers for cross-origin URLs (Supabase
// Storage is a different origin than the app) — this is what actually makes
// the file save to disk instead of just navigating to it.
async function downloadFile(src: string, fileName: string) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    toast.error("ดาวน์โหลดไฟล์ไม่สำเร็จ");
  }
}

async function shareFile(src: string, fileName: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: fileName, url: src });
    } catch {
      // User cancelled the native share sheet — not an error.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(src);
    toast.success("คัดลอกลิงก์แล้ว");
  } catch {
    toast.error("คัดลอกลิงก์ไม่สำเร็จ");
  }
}

// A small action bar mirroring what Google Drive's own file preview offers
// (download / open in a new tab / share) — the account holder asked for this
// specifically after the first inline-preview pass felt unfamiliar compared
// to Drive's.
function DocumentActions({ src, fileName }: { src: string; fileName: string }) {
  return (
    <div className="flex items-center gap-1 self-start">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => downloadFile(src, fileName)}
      >
        <Download className="h-3.5 w-3.5" />
        ดาวน์โหลด
      </Button>
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        render={
          <a href={src} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            เปิดในแท็บใหม่
          </a>
        }
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => shareFile(src, fileName)}
      >
        <Share2 className="h-3.5 w-3.5" />
        แชร์
      </Button>
    </div>
  );
}

// Shown inline below a document's row when its dropdown is opened — never a
// popup (the account holder explicitly asked for the preview to appear
// inside the same box, not a modal/lightbox). Follows the same per-file-kind
// rendering rules as components/Lightbox.tsx (Constitution III): images via
// next/image, video via a native <video> element, PDFs embedded through a
// direct file URL (an iframe, not forced into an <img>), everything else
// falls back to the action bar's download/open link since browsers can't
// render it inline.
function DocumentPreview({ doc }: { doc: Document }) {
  const src = publicFileUrl("documents", doc.storage_path);
  const kind = fileKindFromName(doc.file_name);

  return (
    <div className="flex flex-col gap-2">
      <DocumentActions src={src} fileName={doc.file_name} />

      {kind === "image" && (
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-secondary/50 sm:h-96">
          <Image src={src} alt={doc.file_name} fill sizes="100vw" className="object-contain" />
        </div>
      )}

      {kind === "video" && (
        <video src={src} controls className="max-h-96 w-full rounded-lg bg-black" />
      )}

      {kind === "pdf" && (
        // <object> rather than <iframe> so there is something to fall back to.
        // A browser set to download PDFs instead of displaying them — a common
        // Chrome setting, and Safari's behaviour for some embeds — renders an
        // iframe as a blank rectangle with no way out. Everything inside the
        // object tag shows only when the browser declines to render the PDF.
        <object
          data={src}
          type="application/pdf"
          aria-label={doc.file_name}
          className="h-[85vh] w-full rounded-lg border border-border/60"
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 opacity-60" />
            <p>เบราว์เซอร์นี้แสดง PDF ในหน้าเว็บไม่ได้</p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              เปิดในแท็บใหม่
            </a>
          </div>
        </object>
      )}

      {kind === "other" && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-secondary/50 p-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 opacity-60" />
          <p className="text-sm">ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้ ใช้ปุ่มด้านบนเพื่อดาวน์โหลดหรือเปิดไฟล์</p>
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  canEdit,
  documentGroups,
  categories,
  categoryMoveOptions,
  onDelete,
}: {
  doc: Document;
  canEdit: boolean;
  documentGroups: DocumentGroup[];
  categories: DocumentCategory[];
  categoryMoveOptions: CategoryMoveOption[];
  onDelete: (documentId: string) => void;
}) {
  const extension = doc.file_name.split(".").pop()?.toUpperCase() ?? "";
  return (
    <Collapsible className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 p-3">
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">{extension}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>

        {!USE_MOCK_DATA && canEdit && (
          <div className="flex shrink-0 gap-1">
            <EditModal
              kind="document"
              item={doc}
              moveOptions={categoryMoveOptions}
              groups={documentGroups}
              categories={categories}
              moveLabel="ย้ายไปหมวด"
            />

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="destructive"
                    aria-label={`ลบเอกสาร ${doc.file_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบเอกสารนี้?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การลบนี้ไม่สามารถย้อนกลับได้ เอกสารจะถูกลบออกทันที
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(doc.id)}>ลบ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <CollapsibleContent className="overflow-hidden data-ending-style:h-0 data-starting-style:h-0">
        <div className="border-t border-border/60 p-3">
          <DocumentPreview doc={doc} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// The add field for a new sub-group, shown at the end of the list while
// management mode is on. Its text lives in the provider, not here, so leaving
// management mode and coming back does not discard what was typed (FR-025).
function AddGroupForm({ categoryId }: { categoryId: string }) {
  const { draft, setDraft, clearDraft } = useManageMode();
  const [isPending, startTransition] = useTransition();
  const value = draft(categoryId);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createGroup({ categoryId, nameTh: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearDraft(categoryId);
    });
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2 pt-1">
      <Input
        placeholder="เพิ่มหมวดย่อย เช่น 1.5 งานระบบระบายน้ำ"
        value={value}
        onChange={(event) => setDraft(categoryId, event.target.value)}
        disabled={isPending}
        className="h-9 text-sm"
      />
      <Button type="submit" size="sm" disabled={isPending || !value.trim()}>
        {isPending ? "กำลังเพิ่ม..." : "เพิ่ม"}
      </Button>
    </form>
  );
}

export function DocList({
  documents,
  documentGroups,
  allGroups,
  categories,
  categoryId,
  categoryMoveOptions,
  canEdit,
}: {
  documents: Document[];
  documentGroups: DocumentGroup[];
  /** Every category's groups — the move picker spans all of them (FR-026). */
  allGroups: DocumentGroup[];
  categories: DocumentCategory[];
  categoryId: string;
  categoryMoveOptions: CategoryMoveOption[];
  canEdit: boolean;
}) {
  const { managing } = useManageMode();
  const [, startTransition] = useTransition();
  const [optimisticDocuments, removeOptimisticDocument] = useOptimistic(
    documents,
    (state, documentId: string) => state.filter((doc) => doc.id !== documentId)
  );

  function handleDelete(documentId: string) {
    startTransition(async () => {
      removeOptimisticDocument(documentId);
      const result = await deleteDoc(documentId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  // The empty state is only correct when there is genuinely nothing to show —
  // no documents AND no sub-groups. Before specs/040 those were the same
  // condition, because a group could not exist without a document; now a
  // category can be laid out in advance, and returning early on document count
  // alone would hide every one of its topics. That is exactly the case
  // หมวดที่ 4 ความปลอดภัย is in: 25 topics, no files yet.
  if (optimisticDocuments.length === 0 && documentGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
        <FileText className="h-8 w-8 opacity-50" />
        <p className="font-medium">ยังไม่มีเอกสารในหมวดนี้</p>
        {!USE_MOCK_DATA && canEdit && <p className="text-sm">อัปโหลดเอกสารแรกของคุณด้านล่าง</p>}
      </div>
    );
  }

  // Groups come from the taxonomy now, not from scanning the documents
  // (specs/040-editable-document-taxonomy). That is what lets a group with no
  // documents still appear, and what makes the order deliberate rather than
  // "whichever document happened to come first".
  //
  // Documents belonging to no group still show directly above the groups,
  // exactly as a document with an empty note did before.
  const ungrouped = optimisticDocuments.filter((doc) => !doc.group_id);
  const categorySortOrder = categories.find((category) => category.id === categoryId)?.sort_order;
  const groups = documentGroups.map((group) => ({
    id: group.id,
    name: group.name_th,
    number: groupNumber(group, categorySortOrder),
    docs: optimisticDocuments.filter((doc) => doc.group_id === group.id),
  }));

  return (
    <div className="flex flex-col gap-3">
      {ungrouped.length > 0 && (
        <div className="space-y-2">
          {ungrouped.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canEdit={canEdit}
              documentGroups={allGroups}
              categories={categories}
              categoryMoveOptions={categoryMoveOptions}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {groups.map((group, groupIndex) => (
        <Collapsible key={group.id} className="rounded-xl border border-border/60 bg-card/40">
          {/* The row keeps its place and its label either way; only the
              controls attached to it change (FR-019). In management mode the
              header stops being a collapse trigger, because its whole width is
              now an editable field. */}
          {managing ? (
            <div className="flex w-full items-center justify-between gap-3 p-3">
              <span className="shrink-0 text-xs text-muted-foreground">{group.number}</span>
              <EditableName
                value={group.name}
                ariaLabel={`ชื่อหมวดย่อย ${group.name}`}
                className="text-sm font-medium text-foreground"
                onRename={(nameTh) => renameGroup({ id: group.id, nameTh })}
              />
              <span className="shrink-0 text-xs text-muted-foreground">{group.docs.length} ไฟล์</span>
              <ReorderButtons
                isFirst={groupIndex === 0}
                isLast={groupIndex === groups.length - 1}
                label={group.name}
                onMove={(direction) => moveGroup({ id: group.id, direction })}
              />
              <DeleteTaxonomyDialog
                target={{ kind: "group", id: group.id, name: group.name, categoryId }}
                documentCount={group.docs.length}
                categories={categories}
                allGroups={allGroups}
              />
            </div>
          ) : (
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-3 text-left">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {group.number} {group.name}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {group.docs.length} ไฟล์
                <ChevronDown className="h-4 w-4 transition-transform group-data-panel-open:rotate-180" />
              </span>
            </CollapsibleTrigger>
          )}
          <CollapsibleContent className="overflow-hidden data-ending-style:h-0 data-starting-style:h-0">
            <div className="space-y-2 border-t border-border/60 p-3 pt-2">
              {group.docs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  canEdit={canEdit}
                  documentGroups={allGroups}
                  categories={categories}
                  categoryMoveOptions={categoryMoveOptions}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {managing && <AddGroupForm categoryId={categoryId} />}
    </div>
  );
}
