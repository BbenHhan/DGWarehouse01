"use client";

import { useOptimistic, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Document } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";
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
import { deleteDoc } from "@/app/actions/documents";
import { EditModal } from "@/components/EditModal";
import { USE_MOCK_DATA } from "@/lib/data-config";

type CategoryMoveOption = { value: string; label: string };

export function DocList({
  documents,
  categoryMoveOptions,
  canEdit,
}: {
  documents: Document[];
  categoryMoveOptions: CategoryMoveOption[];
  canEdit: boolean;
}) {
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

  if (optimisticDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
        <FileText className="h-8 w-8 opacity-50" />
        <p className="font-medium">ยังไม่มีเอกสารในหมวดนี้</p>
        {!USE_MOCK_DATA && canEdit && <p className="text-sm">อัปโหลดเอกสารแรกของคุณด้านล่าง</p>}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {optimisticDocuments.map((doc) => {
        const extension = doc.file_name.split(".").pop()?.toUpperCase() ?? "";
        return (
          <li
            key={doc.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <a
              href={publicFileUrl("documents", doc.storage_path)}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium tracking-wide">{extension}</span>
                  {doc.note && <span className="truncate">· {doc.note}</span>}
                </p>
              </div>
            </a>

            {!USE_MOCK_DATA && canEdit && (
              <div className="flex shrink-0 gap-1">
                <EditModal
                  kind="document"
                  item={doc}
                  moveOptions={categoryMoveOptions}
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
                      <AlertDialogAction onClick={() => handleDelete(doc.id)}>ลบ</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
