"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { deleteWeek } from "@/app/actions/photos";

export function DeleteWeekButton({ weekId, photoCount }: { weekId: string; photoCount: number }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWeek(weekId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    // This card's delete button sits absolutely on top of a full-card <Link>
    // (see WorkTypeWeekNav.tsx) — stopPropagation here prevents a click on the
    // button/dialog from also triggering the Link's navigation underneath.
    <div onClick={(e) => e.stopPropagation()}>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label="ลบสัปดาห์นี้"
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบสัปดาห์นี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {photoCount > 0
                ? `สัปดาห์นี้มี ${photoCount} ไฟล์ — ไฟล์ทั้งหมดจะถูกลบไปด้วย การลบนี้ไม่สามารถย้อนกลับได้`
                : "การลบนี้ไม่สามารถย้อนกลับได้ สัปดาห์นี้จะถูกลบออกทันที"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
