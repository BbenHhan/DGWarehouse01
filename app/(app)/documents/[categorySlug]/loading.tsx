import {
  LoadingRegion,
  PageHeaderSkeleton,
  RowsSkeleton,
  Skeleton,
  TabBarSkeleton,
} from "@/components/ui/skeleton";

// Shown while a category's documents are fetched — which happens on every tab
// click, since each category is its own route.
export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดรายการเอกสาร">
      <PageHeaderSkeleton />
      <TabBarSkeleton count={5} />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="border-t border-border/70 pt-4">
        <RowsSkeleton count={6} />
      </div>
    </LoadingRegion>
  );
}
