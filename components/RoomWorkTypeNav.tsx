import Link from "next/link";
import type { Room, Week, WorkType } from "@/lib/types";

function pillClass(active: boolean) {
  return [
    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
  ].join(" ");
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

// Week labels look like "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)" — split so the date
// range can render smaller/muted instead of competing with the week number.
function splitWeekLabel(label: string) {
  const match = label.match(/^(.*?)\s*(\(.*\))?$/);
  return { title: match?.[1] ?? label, subtitle: match?.[2] };
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
    <nav className="space-y-4">
      <div>
        <SectionLabel>ห้อง</SectionLabel>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/photos/${room.slug}/${currentWorkTypeSlug}`}
              className={pillClass(room.slug === currentRoomSlug)}
            >
              <span className="text-base leading-none">{room.emoji}</span>
              {room.name_th}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>ประเภทงาน</SectionLabel>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {workTypes.map((workType) => (
            <Link
              key={workType.id}
              href={`/photos/${currentRoomSlug}/${workType.slug}`}
              className={pillClass(workType.slug === currentWorkTypeSlug)}
            >
              <span className="text-base leading-none">{workType.emoji}</span>
              {workType.name_th}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>สัปดาห์</SectionLabel>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีสัปดาห์</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weeks.map((week) => {
              const active = week.id === selectedWeekId;
              const { title, subtitle } = splitWeekLabel(week.label);
              return (
                <Link
                  key={week.id}
                  href={`/photos/${currentRoomSlug}/${currentWorkTypeSlug}?week=${week.id}`}
                  className={[
                    "flex shrink-0 flex-col rounded-xl border px-3 py-1.5 whitespace-nowrap transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                  ].join(" ")}
                >
                  <span className="text-sm font-semibold">{title}</span>
                  {subtitle && (
                    <span
                      className={[
                        "text-[11px] leading-tight",
                        active ? "text-primary-foreground/80" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {subtitle}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
