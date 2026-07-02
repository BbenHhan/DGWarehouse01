"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Room } from "@/lib/types";

export function RoomNav({ rooms, onNavigate }: { rooms: Room[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const currentRoomSlug = segments[2];
  const currentWorkTypeSlug = segments[3] ?? "";

  return (
    <nav className="flex flex-col gap-1">
      {rooms.map((room) => {
        const active = room.slug === currentRoomSlug;
        return (
          <Link
            key={room.id}
            href={`/photos/${room.slug}/${currentWorkTypeSlug}`}
            onClick={onNavigate}
            className={[
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-accent",
            ].join(" ")}
          >
            <span className="text-base leading-none">{room.emoji}</span>
            {room.name_th}
          </Link>
        );
      })}
    </nav>
  );
}
