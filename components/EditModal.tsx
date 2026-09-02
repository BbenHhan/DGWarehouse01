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
import type { Document, DocumentCategory, DocumentGroup, Photo } from "@/lib/types";
import { groupNumber } from "@/lib/taxonomy-label";

type MoveOption = { value: string; label: string };

type EditModalProps =
  | {
      kind: "photo";
      item: Photo;
      moveOptions: MoveOption[];
      moveLabel: string;
      groups?: undefined;
      categories?: undefined;
    }
  | {
      kind: "document";
      item: Document;
      moveOptions: MoveOption[];
      moveLabel: string;
      groups: DocumentGroup[];
      /** Needed only to number the groups the way the rest of the app does. */
      categories: DocumentCategory[];
    };

// A photo's `note` is a free-text caption and stays exactly as it was. A
// document's grouping is no longer text at all — it is a reference to a real
// sub-group (specs/040-editable-document-taxonomy), so the document branch gets
// a picker over this category's groups instead of a textarea.
const NO_GROUP = "__none__";

export function EditModal({ kind, item, moveOptions, moveLabel, groups, categories }: EditModalProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState(item.file_name);
  const [note, setNote] = useState(kind === "photo" ? item.note ?? "" : "");
  const [groupId, setGroupId] = useState(kind === "document" ? item.group_id ?? NO_GROUP : NO_GROUP);
  const [date, setDate] = useState(kind === "photo" ? item.date : "");
  // Photos move between room/work-type pairs (composite "roomId::workTypeId"
  // value, specs/018-per-photo-dates); documents move between categories.
  const initialMoveTo = kind === "photo" ? `${item.room_id}::${item.work_type_id}` : item.category_id;
  const [moveTo, setMoveTo] = useState(initialMoveTo);
  const [isPending, startTransition] = useTransition();

  // `groups` carries every category's groups; which ones are offered follows
  // whichever destination category is currently selected, so moving a document
  // to another category can still put it straight into one of that category's
  // sub-groups (FR-026). Declared after `moveTo` — reading it above the
  // useState that creates it is a temporal-dead-zone crash, which is exactly
  // what this line did until a render test caught it.
  const groupsForDestination = groups?.filter((group) => group.category_id === moveTo) ?? [];
  const destinationOrder = categories?.find((category) => category.id === moveTo)?.sort_order;
  const labelFor = (group: DocumentGroup) => `${groupNumber(group, destinationOrder)} ${group.name_th}`;

  function handleSave() {
    const trimmedName = fileName.trim();
    if (trimmedName === "") {
      toast.error("ชื่อไฟล์ห้ามว่าง");
      return;
    }

    startTransition(async () => {
      let result;
      if (kind === "photo") {
        const [roomId, workTypeId] = moveTo !== initialMoveTo ? moveTo.split("::") : [undefined, undefined];
        result = await editPhoto({
          photoId: item.id,
          fileName: trimmedName !== item.file_name ? trimmedName : undefined,
          note: note !== (item.note ?? "") ? note : undefined,
          date: date !== item.date ? date : undefined,
          roomId,
          workTypeId,
        });
      } else {
        const nextGroupId = groupId === NO_GROUP ? null : groupId;
        result = await editDoc({
          documentId: item.id,
          fileName: trimmedName !== item.file_name ? trimmedName : undefined,
          groupId: nextGroupId !== (item.group_id ?? null) ? nextGroupId : undefined,
          categoryId: moveTo !== initialMoveTo ? moveTo : undefined,
        });
      }

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

          {kind === "photo" && (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="edit-date">
                วันที่
              </label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}

          {kind === "photo" ? (
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
          ) : (
            <div className="space-y-1">
              <span className="text-sm font-medium">หมวดย่อย</span>
              <Select value={groupId} onValueChange={(value) => value !== null && setGroupId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      (() => {
                        const found = groupsForDestination.find((group) => group.id === value);
                        return found ? labelFor(found) : "ไม่มีหมวดย่อย";
                      })()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>ไม่มีหมวดย่อย</SelectItem>
                  {groupsForDestination.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {labelFor(group)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-sm font-medium">{moveLabel}</span>
            <Select
              value={moveTo}
              onValueChange={(value) => {
                if (value === null) return;
                setMoveTo(value);
                // The old group belongs to the old category, so it cannot come
                // along; the document lands ungrouped unless one of the new
                // category's groups is picked.
                if (kind === "document" && value !== moveTo) setGroupId(NO_GROUP);
              }}
            >
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
