"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { useManageMode } from "@/components/ManageModeProvider";
import { Button } from "@/components/ui/button";

// Up/down buttons rather than drag-and-drop (spec FR-021). The team uses this
// on a phone during factory inspections, where a drag misfires easily, and drag
// would need a dependency this project does not have.
//
// Clicks are queued rather than debounced — see ManageModeProvider.enqueue.
export function ReorderButtons({
  isFirst,
  isLast,
  label,
  onMove,
}: {
  isFirst: boolean;
  isLast: boolean;
  label: string;
  onMove: (direction: "up" | "down") => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const { enqueue } = useManageMode();

  function move(direction: "up" | "down") {
    enqueue(async () => {
      const result = await onMove(direction);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <span className="flex shrink-0 items-center">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isFirst}
        aria-label={`เลื่อน ${label} ขึ้น`}
        onClick={() => move("up")}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isLast}
        aria-label={`เลื่อน ${label} ลง`}
        onClick={() => move("down")}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </span>
  );
}
