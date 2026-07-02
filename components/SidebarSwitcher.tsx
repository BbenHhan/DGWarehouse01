"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Room } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function SidebarSwitcher({
  rooms,
  roomPhotoCounts,
  documentCount,
}: {
  rooms: Room[];
  roomPhotoCounts: Record<string, number>;
  documentCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  let currentLabel = "เมนู";
  let currentEmoji = "📂";
  if (pathname.startsWith("/documents")) {
    currentLabel = "รายการเอกสาร";
    currentEmoji = "📄";
  } else if (pathname.startsWith("/photos")) {
    const room = rooms.find((r) => r.slug === pathname.split("/")[2]);
    if (room) {
      currentLabel = room.name_th;
      currentEmoji = room.emoji;
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm"
      >
        <span className="flex items-center gap-2">
          <span className="text-base leading-none">{currentEmoji}</span>
          {currentLabel}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>เมนู</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <Sidebar
            rooms={rooms}
            roomPhotoCounts={roomPhotoCounts}
            documentCount={documentCount}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
