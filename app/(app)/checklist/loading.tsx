import { LoadingRegion, PageHeaderSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดเช็คลิสต์">
      <PageHeaderSkeleton />
      <RowsSkeleton count={6} />
    </LoadingRegion>
  );
}
