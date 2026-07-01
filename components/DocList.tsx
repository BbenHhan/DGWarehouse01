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

type CategoryMoveOption = { value: string; label: string };

export function DocList({
  documents,
  categoryMoveOptions,
}: {
  documents: Document[];
  categoryMoveOptions: CategoryMoveOption[];
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
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p>ยังไม่มีเอกสารในหมวดนี้</p>
        <p className="text-sm">อัปโหลดเอกสารแรกของคุณด้านล่าง</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {optimisticDocuments.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 p-3">
          <a
            href={publicFileUrl("documents", doc.storage_path)}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
          >
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.file_name}</p>
              {doc.note && (
                <p className="truncate text-xs text-muted-foreground">{doc.note}</p>
              )}
            </div>
          </a>

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
        </li>
      ))}
    </ul>
  );
}
