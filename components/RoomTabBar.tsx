"use client";

import type { Room } from "@/lib/types";
import { groupRooms } from "@/lib/room-groups";
import { cn } from "@/lib/utils";

// Room tabs, grouped into their own boxes (ห้องแรก / ห้องกลาง / ห้องเย็น) —
// same grouping components/Sidebar.tsx already uses, so the room structure
// looks the same everywhere on the site (per live feedback from the account
// holder). Clicking a room switches the active room; dragging an unsorted
// file chip onto one also switches it (it does NOT by itself assign a work
// type — the user still drops into a bin afterward), per
// specs/015-multi-upload-drag-sort spec.md Acceptance Scenario 3.
export function RoomTabBar({
  rooms,
  activeRoomId,
  onSelectRoom,
}: {
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
}) {
  const groups = groupRooms(rooms);

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <div
          key={group.key}
          className="flex flex-col gap-1.5 rounded-2xl border border-border bg-background p-2"
        >
          <p className="flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
            <span>{group.emoji}</span>
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.rooms.map((room) => {
              const active = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.getData("text/plain")) onSelectRoom(room.id);
                  }}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {room.name_th}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
