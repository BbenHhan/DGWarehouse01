"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createWeek } from "@/app/actions/photos";

export function AddWeekButton({ roomId, workTypeId }: { roomId: string; workTypeId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createWeek(roomId, workTypeId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button type="button" variant="secondary" onClick={handleClick} disabled={isPending}>
      {isPending ? "กำลังสร้าง..." : "+ สัปดาห์ใหม่"}
    </Button>
  );
}
