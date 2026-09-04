import { LoadingRegion, RowsSkeleton, Skeleton, TabBarSkeleton } from "@/components/ui/skeleton";

// Mirrors the workspace: drop zone on top, then the tray beside the bins.
export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดหน้าอัปโหลดเอกสาร">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <RowsSkeleton count={3} />
        <div className="flex flex-col gap-3">
          <TabBarSkeleton count={3} />
          <Skeleton className="h-9 w-full rounded-md" />
          <RowsSkeleton count={5} />
        </div>
      </div>
    </LoadingRegion>
  );
}
