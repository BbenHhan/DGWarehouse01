"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Optional start/end date filter for a room/work-type's photo list
// (specs/018-per-photo-dates, replaces WorkTypeWeekNav's week-tab strip).
// Self-contained: reads/writes the ?from=&to= query params directly so the
// filtered view stays shareable/bookmarkable, the same way the old ?week=
// param did — the server page reads the same params to fetch the filtered
// photo list, no prop drilling needed between the two.
export function PhotoDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function updateParam(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  const hasFilter = Boolean(from || to);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="photo-filter-from">
          จากวันที่
        </label>
        <Input
          id="photo-filter-from"
          type="date"
          value={from}
          onChange={(e) => updateParam("from", e.target.value)}
          className="w-fit"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="photo-filter-to">
          ถึงวันที่
        </label>
        <Input
          id="photo-filter-to"
          type="date"
          value={to}
          onChange={(e) => updateParam("to", e.target.value)}
          className="w-fit"
        />
      </div>
      {hasFilter && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
