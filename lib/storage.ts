import { DATA_SOURCE } from "@/lib/data-config";

export function publicFileUrl(bucket: "photos" | "documents", storagePath: string) {
  if (DATA_SOURCE === "mock") {
    const encodedSegments = storagePath.split("/").map(encodeURIComponent).join("/");
    return `/api/mock-file/${encodedSegments}`;
  }

  if (DATA_SOURCE === "local") {
    const encodedSegments = storagePath.split("/").map(encodeURIComponent).join("/");
    return `/api/local-file/${encodedSegments}`;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}
