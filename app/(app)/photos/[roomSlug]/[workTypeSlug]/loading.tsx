import { LoadingRegion, PageHeaderSkeleton, Skeleton, TabBarSkeleton } from "@/components/ui/skeleton";

// The photo timeline scrolls horizontally in fixed-width day columns, so its
// skeleton is columns rather than rows.
export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดรูปภาพ">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="order-2 flex flex-col gap-5 lg:order-1">
          <TabBarSkeleton count={6} />
          <Skeleton className="h-10 w-72 max-w-full rounded-xl" />
          <div className="flex gap-4 overflow-hidden border-t border-border/70 pt-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex w-[220px] shrink-0 flex-col gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="aspect-square w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
