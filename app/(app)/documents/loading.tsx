import { LoadingRegion, PageHeaderSkeleton, RowsSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="กำลังโหลดหมวดเอกสาร">
      <PageHeaderSkeleton />
      <RowsSkeleton count={5} />
    </LoadingRegion>
  );
}
