"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWeek } from "@/app/actions/photos";

export function AddWeekButton({ roomId, workTypeId }: { roomId: string; workTypeId: string }) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await createWeek(roomId, workTypeId, startDate, endDate);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("สร้างสัปดาห์ใหม่แล้ว");
      setStartDate("");
      setEndDate("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="secondary">
            + สัปดาห์ใหม่
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มสัปดาห์ใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="week-start-date">
              วันที่เริ่มต้น
            </label>
            <Input
              id="week-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="week-end-date">
              วันที่สิ้นสุด
            </label>
            <Input
              id="week-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !startDate || !endDate}
          >
            {isPending ? "กำลังสร้าง..." : "สร้างสัปดาห์"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
