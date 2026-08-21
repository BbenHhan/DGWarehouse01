import Link from "next/link";
import type { WorkType } from "@/lib/types";

// The work-type tab strip WorkTypeWeekNav.tsx used to also render above its
// week strip — that week strip is gone entirely (specs/018-per-photo-dates
// replaces it with PhotoDateFilter + a flat chronological PhotoGrid), so
// this component is just the tabs, unchanged in appearance/behavior.
export function WorkTypePhotoNav({
  workTypes,
  currentRoomSlug,
  currentWorkTypeSlug,
}: {
  workTypes: WorkType[];
  currentRoomSlug: string;
  currentWorkTypeSlug: string;
}) {
  return (
    <nav className="scroll-thin flex gap-2 overflow-x-auto pb-2">
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
    </nav>
  );
}
