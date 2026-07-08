// Photos and documents modules now both accept image/PDF/video (Constitution
// VIII), so rendering needs to branch per file, not assume "photo module
// always means image". Keyed off the extension since that's all we have for
// files that arrived as a generic upload rather than a typed Supabase row.
export type FileKind = "image" | "video" | "pdf" | "other";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);

export function fileKindFromName(fileName: string): FileKind {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
  if (extension === ".pdf") return "pdf";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  return "other";
}
