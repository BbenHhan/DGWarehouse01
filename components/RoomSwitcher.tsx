"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Room } from "@/lib/types";
import { RoomNav } from "@/components/RoomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function RoomSwitcher({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentRoomSlug = pathname.split("/")[2];
  const currentRoom = rooms.find((room) => room.slug === currentRoomSlug);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm"
      >
        <span className="flex items-center gap-2">
          <span className="text-base leading-none">{currentRoom?.emoji}</span>
          {currentRoom?.name_th ?? "เลือกห้อง"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>เลือกห้อง</SheetTitle>
        </SheetHeader>
        <div className="px-4">
          <RoomNav rooms={rooms} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
