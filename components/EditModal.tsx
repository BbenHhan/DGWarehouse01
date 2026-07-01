"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { editPhoto } from "@/app/actions/photos";
import { editDoc } from "@/app/actions/documents";
import type { Document, Photo } from "@/lib/types";

type MoveOption = { value: string; label: string };

type EditModalProps =
  | { kind: "photo"; item: Photo; moveOptions: MoveOption[]; moveLabel: string }
  | { kind: "document"; item: Document; moveOptions: MoveOption[]; moveLabel: string };

export function EditModal({ kind, item, moveOptions, moveLabel }: EditModalProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState(item.file_name);
  const [note, setNote] = useState(item.note ?? "");
  const initialMoveTo = kind === "photo" ? item.week_id : item.category_id;
  const [moveTo, setMoveTo] = useState(initialMoveTo);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmedName = fileName.trim();
    if (trimmedName === "") {
      toast.error("ชื่อไฟล์ห้ามว่าง");
      return;
    }

    startTransition(async () => {
      const result =
        kind === "photo"
          ? await editPhoto({
              photoId: item.id,
              fileName: trimmedName !== item.file_name ? trimmedName : undefined,
              note: note !== (item.note ?? "") ? note : undefined,
              weekId: moveTo !== initialMoveTo ? moveTo : undefined,
            })
          : await editDoc({
              documentId: item.id,
              fileName: trimmedName !== item.file_name ? trimmedName : undefined,
              note: note !== (item.note ?? "") ? note : undefined,
              categoryId: moveTo !== initialMoveTo ? moveTo : undefined,
            });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("บันทึกการแก้ไขแล้ว");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`แก้ไข ${item.file_name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไข{kind === "photo" ? "รูปภาพ" : "เอกสาร"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="edit-file-name">
              ชื่อไฟล์
            </label>
            <Input id="edit-file-name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="edit-note">
              คำอธิบาย
            </label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">{moveLabel}</span>
            <Select value={moveTo} onValueChange={(value) => value !== null && setMoveTo(value)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    moveOptions.find((option) => option.value === value)?.label ?? "เลือก..."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {moveOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
