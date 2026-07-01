export function publicFileUrl(bucket: "photos" | "documents", storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}
