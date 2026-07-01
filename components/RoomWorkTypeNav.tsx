import Link from "next/link";
import type { Room, Week, WorkType } from "@/lib/types";

function tabClass(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-accent",
  ].join(" ");
}

export function RoomWorkTypeNav({
  rooms,
  workTypes,
  weeks,
  currentRoomSlug,
  currentWorkTypeSlug,
  selectedWeekId,
}: {
  rooms: Room[];
  workTypes: WorkType[];
  weeks: Week[];
  currentRoomSlug: string;
  currentWorkTypeSlug: string;
  selectedWeekId: string | undefined;
}) {
  return (
    <nav className="space-y-3">
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/photos/${room.slug}/${currentWorkTypeSlug}`}
            className={tabClass(room.slug === currentRoomSlug)}
          >
            {room.emoji} {room.name_th}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {workTypes.map((workType) => (
          <Link
            key={workType.id}
            href={`/photos/${currentRoomSlug}/${workType.slug}`}
            className={tabClass(workType.slug === currentWorkTypeSlug)}
          >
            {workType.emoji} {workType.name_th}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {weeks.map((week) => (
          <Link
            key={week.id}
            href={`/photos/${currentRoomSlug}/${currentWorkTypeSlug}?week=${week.id}`}
            className={tabClass(week.id === selectedWeekId)}
          >
            {week.label}
          </Link>
        ))}
        {weeks.length === 0 && (
          <span className="py-1.5 text-sm text-muted-foreground">ยังไม่มีสัปดาห์</span>
        )}
      </div>
    </nav>
  );
}
