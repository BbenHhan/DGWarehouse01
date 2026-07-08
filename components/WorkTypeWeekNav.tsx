import Link from "next/link";
import type { Week, WorkType } from "@/lib/types";
import { formatWeekDateRangeOrNull } from "@/lib/week-format";
import { DeleteWeekButton } from "@/components/DeleteWeekButton";

// Legacy fallback for "mock" backend weeks, which have no start_date/end_date
// (see specs/002-week-date-range-ui/research.md Decision 3) — their label text
// already embeds a date range like "สัปดาห์ที่ 6 (8-15 มิ.ย. 2569)".
function splitWeekLabel(label: string) {
  const match = label.match(/^สัปดาห์ที่\s*(\d+)\s*\((.*?)\s*\d{4}\)/);
  return { number: match?.[1] ?? label, subtitle: match?.[2] };
}

// Primary card text is the week's date range when available (local/supabase
// weeks); mock-backend weeks fall back to their legacy label parsing.
function weekCardText(week: Week) {
  const dateRange = formatWeekDateRangeOrNull(week);
  if (dateRange) {
    return { primary: dateRange, secondary: null as string | null };
  }
  const { number, subtitle } = splitWeekLabel(week.label);
  return { primary: `สัปดาห์ที่ ${number}`, secondary: subtitle ?? null };
}

export function WorkTypeWeekNav({
  workTypes,
  weeks,
  currentRoomSlug,
  currentWorkTypeSlug,
  selectedWeekId,
  showActions,
}: {
  workTypes: WorkType[];
  weeks: Array<{ week: Week; photoCount: number }>;
  currentRoomSlug: string;
  currentWorkTypeSlug: string;
  selectedWeekId: string | undefined;
  showActions: boolean;
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
        <div className="scroll-thin flex gap-2 overflow-x-auto pt-1 pb-3">
          {weeks.map(({ week, photoCount }) => {
            const active = week.id === selectedWeekId;
            const hasPhotos = photoCount > 0;
            const { primary, secondary } = weekCardText(week);
            return (
              <div
                key={week.id}
                className={[
                  "group relative min-w-[132px] shrink-0 rounded-xl border transition-all",
                  active
                    ? "border-transparent bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_3px_14px_rgba(155,94,40,.35)]"
                    : hasPhotos
                      ? "border-gold bg-gold/10 text-foreground hover:border-gold/60"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                ].join(" ")}
              >
                <Link
                  href={`/photos/${currentRoomSlug}/${currentWorkTypeSlug}?week=${week.id}`}
                  className={["flex flex-col gap-0.5 px-3 py-2.5", showActions ? "pr-8" : ""].join(" ")}
                >
                  <span className="text-sm leading-tight font-semibold whitespace-nowrap">{primary}</span>
                  {secondary && (
                    <span
                      className={[
                        "text-xs leading-tight whitespace-nowrap",
                        active ? "text-primary-foreground/80" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {secondary}
                    </span>
                  )}
                  <span
                    className={[
                      "text-xs font-medium",
                      hasPhotos
                        ? active
                          ? "text-primary-foreground/90"
                          : "text-gold"
                        : active
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/60",
                    ].join(" ")}
                  >
                    {hasPhotos ? `${photoCount} ไฟล์` : "ยังไม่มีไฟล์"}
                  </span>
                </Link>

                {showActions && (
                  <div className="absolute top-1.5 right-1.5">
                    <DeleteWeekButton weekId={week.id} photoCount={photoCount} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
