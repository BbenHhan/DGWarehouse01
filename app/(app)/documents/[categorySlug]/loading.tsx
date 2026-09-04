import { LoadingRegion, RowsSkeleton, Skeleton } from "@/components/ui/skeleton";

// Only the content below the tab bar — the header, management panel and tabs
// come from layout.tsx and stay on screen while this shows.
export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดรายการเอกสาร">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="border-t border-border/70 pt-4">
        <RowsSkeleton count={6} />
      </div>
    </LoadingRegion>
  );
}
