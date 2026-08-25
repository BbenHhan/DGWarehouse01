"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, FileText, Upload } from "lucide-react";
import type { Room } from "@/lib/types";
import { groupRooms } from "@/lib/room-groups";

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
  badge?: number;
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
      {badge !== undefined && (
        <span
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({
  rooms,
  roomPhotoCounts,
  documentCount,
  showUploadLink,
  onNavigate,
}: {
  rooms: Room[];
  roomPhotoCounts: Record<string, number>;
  documentCount: number;
  showUploadLink?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/");
  const isDocuments = pathname.startsWith("/documents");
  const isChecklist = pathname.startsWith("/checklist");
  const currentRoomSlug = !isDocuments && !isChecklist ? segments[2] : undefined;
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
        <SidebarLink
          href="/checklist"
          active={isChecklist}
          icon={<CheckSquare className="h-4 w-4 shrink-0" />}
          label="เช็คลิสต์"
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

      {showUploadLink && (
        <div>
          <SidebarLink
            href="/upload"
            active={pathname === "/upload"}
            icon={<Upload className="h-4 w-4 shrink-0" />}
            label="อัปโหลดรูปหลายไฟล์"
            onNavigate={onNavigate}
          />
        </div>
      )}
    </nav>
  );
}
