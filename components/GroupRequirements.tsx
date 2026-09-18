import { REQUIREMENT_STATUS_META } from "@/lib/requirement-status";
import type { GroupRequirement } from "@/lib/types";

// specs/046-subgroup-requirement-checklist US1.
//
// What a sub-group is for, and what it should hold, readable without opening
// it. Deliberately no totals (FR-006): the account holder asked to see the items
// themselves, not how many are left.
//
// Server-renderable — no state, no handlers — so a viewer's page ships no extra
// JavaScript for it.
export function GroupRequirements({
  description,
  items,
}: {
  description?: string | null;
  items: GroupRequirement[];
}) {
  // FR-007: a sub-group nobody has described looks exactly as it did.
  if (!description && items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}

      {items.length > 0 && (
        <ul aria-label="รายการเอกสารที่ต้องมี" className="flex flex-col gap-1.5">
          {items.map((item) => {
            const meta = REQUIREMENT_STATUS_META[item.status];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex items-start gap-2">
                {/* Icon and word as well as colour (FR-005). Fixed width so the
                    names line up down the list whatever the status. */}
                <span
                  className={[
                    "mt-px inline-flex w-[5.75rem] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    meta.toneClass,
                  ].join(" ")}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden />
                  {meta.label}
                </span>
                {/* min-w-0 + break-words: a long certificate name wraps inside
                    the row at 375px instead of pushing the chip off-screen. */}
                <span className="min-w-0 flex-1 text-xs leading-relaxed">
                  <span className="break-words text-foreground">{item.name_th}</span>
                  {item.note && <span className="block break-words text-muted-foreground">{item.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
