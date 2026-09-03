export type ProgressHandler = (received: number, total: number | null) => void;

/**
 * Downloads a file once while reporting how much has arrived.
 *
 * The resolved blob is the same bytes that were counted, so a preview that
 * reports progress does not pay for a second download (FR-014b). `total` is
 * null when the server does not declare a length — a compressed or chunked
 * response — and the caller then reports bytes received without a share.
 */
export async function fetchWithProgress(
  url: string,
  onProgress: ProgressHandler,
  signal?: AbortSignal
): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`โหลดไฟล์ไม่สำเร็จ (${response.status})`);
  }

  const declared = Number(response.headers.get("Content-Length"));
  const total = Number.isFinite(declared) && declared > 0 ? declared : null;
  const type = response.headers.get("Content-Type") ?? "application/octet-stream";

  // No streaming body available (some browsers, and jsdom): still resolve the
  // file rather than failing, and report it as arriving in one piece.
  if (!response.body) {
    const blob = await response.blob();
    onProgress(blob.size, total ?? blob.size);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    onProgress(received, total);
  }

  return new Blob(chunks as BlobPart[], { type });
}

/** "12.4 MB" — used beside the share so a long wait has a size attached to it. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
