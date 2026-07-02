"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import type { Room } from "@/lib/types";

// Presentational grouping only (no schema change) — mirrors the real v7
// folder layout, where ❄️ ห้องเย็น physically wraps ห้องย่อย 1-4.
type RoomGroup = { key: string; label: string; emoji: string; rooms: Room[] };
function groupRooms(rooms: Room[]): RoomGroup[] {
  const coldRooms = rooms.filter((room) => room.slug.startsWith("hong-soi-"));
  const singleRooms = rooms.filter((room) => !room.slug.startsWith("hong-soi-"));
  const groups: RoomGroup[] = singleRooms.map((room) => ({
    key: room.id,
    label: room.name_th,
    emoji: room.emoji,
    rooms: [room],
  }));
  if (coldRooms.length > 0) {
    groups.push({ key: "cold", label: "ห้องเย็น", emoji: "❄️", rooms: coldRooms });
  }
  return groups;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function SidebarLink({
  href,
  active,
  icon,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
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
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={[
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
        ].join(" ")}
      >
        {badge}
      </span>
    </Link>
  );
}

export function Sidebar({
  rooms,
  roomPhotoCounts,
  documentCount,
  onNavigate,
}: {
  rooms: Room[];
  roomPhotoCounts: Record<string, number>;
  documentCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const isDocuments = pathname.startsWith("/documents");
  const currentRoomSlug = !isDocuments ? segments[2] : undefined;
  const currentWorkTypeSlug = segments[3] || "firewalls";

  const groups = groupRooms(rooms);

  return (
    <nav className="flex flex-col gap-5">
      <div>
        <SectionLabel>Overview</SectionLabel>
        <SidebarLink
          href="/documents"
          active={isDocuments}
          icon={<FileText className="h-4 w-4 shrink-0" />}
          label="รายการเอกสาร"
          badge={documentCount}
          onNavigate={onNavigate}
        />
      </div>

      {groups.map((group) => (
        <div key={group.key}>
          <SectionLabel>
            <span>{group.emoji}</span>
            {group.label}
          </SectionLabel>
          <div className="flex flex-col gap-1">
            {group.rooms.map((room) => (
              <SidebarLink
                key={room.id}
                href={`/photos/${room.slug}/${currentWorkTypeSlug}`}
                active={room.slug === currentRoomSlug}
                icon={<span className="text-base leading-none">{room.emoji}</span>}
                label={room.name_th}
                badge={roomPhotoCounts[room.id] ?? 0}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
