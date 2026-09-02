import { LoadingRegion, PageHeaderSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดรายชื่อผู้ใช้">
      <PageHeaderSkeleton />
      <RowsSkeleton count={5} />
    </LoadingRegion>
  );
}
