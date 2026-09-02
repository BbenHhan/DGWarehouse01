import { LoadingRegion, PageHeaderSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดห้อง">
      <PageHeaderSkeleton />
      <RowsSkeleton count={6} />
    </LoadingRegion>
  );
}
