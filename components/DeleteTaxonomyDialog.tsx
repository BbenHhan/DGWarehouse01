"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory, deleteGroup } from "@/app/actions/document-taxonomy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentCategory, DocumentGroup } from "@/lib/types";

// specs/040-editable-document-taxonomy, US5.
//
// Removing something empty asks once. Removing something holding documents
// makes the editor choose what becomes of them first, and choosing to destroy
// them asks a second time with the number named (FR-011, FR-011a). The
// asymmetry is deliberate: the second step exists to make destroying files
// hard, so putting it in front of an empty group would only train people to
// click through it.
//
// None of this is the safeguard. The Server Action re-checks the count and
// refuses a stale one; this is the part that makes the decision an informed
// one.
const NO_GROUP = "__none__";

type Target =
  | { kind: "group"; id: string; name: string; categoryId: string }
  | { kind: "category"; id: string; name: string };

export function DeleteTaxonomyDialog({
  target,
  documentCount,
  categories,
  allGroups,
}: {
  target: Target;
  documentCount: number;
  categories: DocumentCategory[];
  allGroups: DocumentGroup[];
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toCategoryId, setToCategoryId] = useState("");
  const [toGroupId, setToGroupId] = useState(NO_GROUP);
  const [isPending, startTransition] = useTransition();

  // A destination inside the thing being deleted is never offered — the
  // documents would be destroyed a moment after arriving (spec Edge Cases).
  const destinationCategories =
    target.kind === "category" ? categories.filter((category) => category.id !== target.id) : categories;
  const destinationGroups = allGroups.filter(
    (group) => group.category_id === toCategoryId && !(target.kind === "group" && group.id === target.id)
  );

  function reset() {
    setConfirming(false);
    setToCategoryId("");
    setToGroupId(NO_GROUP);
  }

  function run(documents: Parameters<typeof deleteGroup>[0]["documents"]) {
    startTransition(async () => {
      const result =
        target.kind === "group"
          ? await deleteGroup({ id: target.id, documents })
          : await deleteCategory({ id: target.id, documents });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(target.kind === "group" ? "ลบหมวดย่อยแล้ว" : "ลบหมวดแล้ว");
      setOpen(false);
      reset();
    });
  }

  const label = target.kind === "group" ? "หมวดย่อย" : "หมวด";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Dismissing at any point leaves everything untouched (FR-011b).
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`ลบ ${target.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirming ? `ยืนยันการลบ ${documentCount} ไฟล์` : `ลบ${label} "${target.name}"`}
          </DialogTitle>
        </DialogHeader>

        {documentCount === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {label}นี้ไม่มีไฟล์อยู่ข้างใน
              {target.kind === "category" ? " หมวดย่อยข้างในจะถูกลบไปด้วย" : ""}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={() => run({ kind: "none" })} disabled={isPending}>
                {isPending ? "กำลังลบ..." : "ลบ"}
              </Button>
            </DialogFooter>
          </>
        ) : confirming ? (
          <>
            <p className="text-sm text-destructive">
              ไฟล์ {documentCount} ไฟล์จะถูกลบถาวร กู้คืนไม่ได้
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
                ย้อนกลับ
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => run({ kind: "delete", confirmedCount: documentCount })}
              >
                {isPending ? "กำลังลบ..." : `ลบ ${documentCount} ไฟล์`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {label}นี้มีไฟล์อยู่ {documentCount} ไฟล์ — เลือกก่อนว่าจะให้ไฟล์เหล่านี้ไปไหน
            </p>

            <div className="space-y-2">
              <span className="text-sm font-medium">ย้ายไปที่</span>
              <Select value={toCategoryId} onValueChange={(value) => {
                if (value === null) return;
                setToCategoryId(value);
                setToGroupId(NO_GROUP);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      destinationCategories.find((category) => category.id === value)?.name_th ?? "เลือกหมวด..."
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {destinationCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.emoji} {category.name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {toCategoryId && (
                <Select value={toGroupId} onValueChange={(value) => value !== null && setToGroupId(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        destinationGroups.find((group) => group.id === value)?.name_th ?? "ไม่มีหมวดย่อย"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GROUP}>ไม่มีหมวดย่อย</SelectItem>
                    {destinationGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => setConfirming(true)}
              >
                ลบไฟล์ทั้งหมดด้วย
              </Button>
              <Button
                type="button"
                disabled={isPending || !toCategoryId}
                onClick={() =>
                  run({
                    kind: "move",
                    toCategoryId,
                    toGroupId: toGroupId === NO_GROUP ? null : toGroupId,
                  })
                }
              >
                {isPending ? "กำลังย้าย..." : `ย้าย ${documentCount} ไฟล์แล้วลบ`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
