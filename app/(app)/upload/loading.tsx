import { LoadingRegion, RowsSkeleton, Skeleton, TabBarSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดหน้าอัปโหลดรูป">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <RowsSkeleton count={3} />
        <div className="flex flex-col gap-3">
          <TabBarSkeleton count={3} />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
