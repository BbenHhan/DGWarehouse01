import Link from "next/link";
import type { Week, WorkType } from "@/lib/types";

// Week labels look like "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)" — split so the date
// range can render smaller/muted instead of competing with the week number.
function splitWeekLabel(label: string) {
  const match = label.match(/^สัปดาห์ที่\s*(\d+)\s*(\(.*\))?/);
  return { number: match?.[1] ?? label, subtitle: match?.[2] };
}

export function WorkTypeWeekNav({
  workTypes,
  weeks,
  currentRoomSlug,
  currentWorkTypeSlug,
  selectedWeekId,
}: {
  workTypes: WorkType[];
  weeks: Array<{ week: Week; photoCount: number }>;
  currentRoomSlug: string;
  currentWorkTypeSlug: string;
  selectedWeekId: string | undefined;
}) {
  return (
    <nav className="space-y-4">
      <div className="scroll-thin flex gap-2 overflow-x-auto pb-2">
        {workTypes.map((workType) => {
          const active = workType.slug === currentWorkTypeSlug;
          return (
            <Link
              key={workType.id}
              href={`/photos/${currentRoomSlug}/${workType.slug}`}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                active
                  ? "border-transparent bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_3px_14px_rgba(155,94,40,.35)]"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
              ].join(" ")}
            >
              <span className="text-base leading-none">{workType.emoji}</span>
              {workType.name_th}
            </Link>
          );
        })}
      </div>

      {weeks.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีสัปดาห์</p>
      ) : (
        <div className="scroll-thin relative flex gap-0 overflow-x-auto pt-1 pb-3">
          <div className="absolute top-5 right-4 left-4 h-0.5 bg-border" />
          {weeks.map(({ week, photoCount }) => {
            const active = week.id === selectedWeekId;
            const hasPhotos = photoCount > 0;
            const { number, subtitle } = splitWeekLabel(week.label);
            return (
              <Link
                key={week.id}
                href={`/photos/${currentRoomSlug}/${currentWorkTypeSlug}?week=${week.id}`}
                className="relative z-10 flex min-w-[104px] shrink-0 flex-col items-center gap-1 px-2"
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all",
                    active
                      ? "border-transparent bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_0_0_4px_rgba(155,94,40,.18)]"
                      : hasPhotos
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  ].join(" ")}
                >
                  W{number}
                </span>
                {subtitle && (
                  <span
                    className={[
                      "text-center text-[10px] leading-tight whitespace-nowrap",
                      active ? "text-primary" : hasPhotos ? "text-gold" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {subtitle.replace(/[()]/g, "")}
                  </span>
                )}
                <span
                  className={[
                    "text-[10px] font-semibold",
                    hasPhotos
                      ? active
                        ? "text-primary"
                        : "text-gold"
                      : "text-muted-foreground/60",
                  ].join(" ")}
                >
                  {hasPhotos ? photoCount : "—"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
