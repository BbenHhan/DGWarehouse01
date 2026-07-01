import { USE_MOCK_DATA } from "@/lib/data-config";

export function publicFileUrl(bucket: "photos" | "documents", storagePath: string) {
  if (USE_MOCK_DATA) {
    const encodedSegments = storagePath.split("/").map(encodeURIComponent).join("/");
    return `/api/mock-file/${encodedSegments}`;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}
