import { Check, Clock, X, type LucideIcon } from "lucide-react";
import type { RequirementStatus } from "@/lib/types";

// specs/046-subgroup-requirement-checklist research Decision 2.
//
// One map for how each status looks, shared by the read-only list and the
// editor so the two can never disagree. Every status carries an icon and a Thai
// word as well as a colour: FR-005 requires the three to be told apart without
// relying on colour, which matters on a phone in sunlight as much as for
// colour-blind readers.
export const REQUIREMENT_STATUSES: RequirementStatus[] = ["have", "missing", "waiting"];

export const REQUIREMENT_STATUS_META: Record<
  RequirementStatus,
  { label: string; shortLabel: string; icon: LucideIcon; toneClass: string }
> = {
  have: {
    label: "มีแล้ว",
    shortLabel: "มีแล้ว",
    icon: Check,
    toneClass: "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  },
  missing: {
    label: "ยังขาด",
    shortLabel: "ยังขาด",
    icon: X,
    toneClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  waiting: {
    label: "รอดำเนินการ",
    shortLabel: "รอ",
    icon: Clock,
    toneClass: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
};

// The Thai words the spec appendix uses, back to the stored code. Used by the
// seed test to compare the migration against the appendix (SC-002).
export function requirementStatusFromLabel(label: string): RequirementStatus | null {
  const found = REQUIREMENT_STATUSES.find((status) => REQUIREMENT_STATUS_META[status].label === label.trim());
  return found ?? null;
}
