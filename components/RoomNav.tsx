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
              "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              active
                ? "bg-primary/12 text-primary"
                : "text-foreground hover:bg-accent hover:text-accent-foreground",
            ].join(" ")}
          >
            {active && (
              <span className="absolute top-[18%] left-0 h-[64%] w-[3px] rounded-r-[3px] bg-primary shadow-[0_0_10px_rgba(155,94,40,.5)]" />
            )}
            <span className="text-base leading-none">{room.emoji}</span>
            {room.name_th}
          </Link>
        );
      })}
    </nav>
  );
}
