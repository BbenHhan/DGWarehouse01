// Supabase Storage rejects any object key containing non-ASCII characters,
// failing the upload outright with an InvalidKey error. Nearly every file
// name in this project is Thai, so a key built straight from a user's file
// name fails every time — confirmed live against the real project.
//
// supabase/seed/import-documents.ts hit this during Feature 017 and worked
// around it locally; the Server Actions behind the app's own upload buttons
// never got the same treatment. This is that fix, shared by both so they
// can't drift apart again.
//
// Only the storage key is reshaped. The original file name is stored
// untouched in the row's `file_name` column and is what the UI shows, so
// nothing user-visible changes. Callers prefix the result with a UUID, so
// two different Thai names collapsing to the same fallback can never
// overwrite each other.
const UNSAFE_KEY_CHARS = /[^A-Za-z0-9._-]/g;

export function storageKeyFileName(fileName: string): string {
  // Not path.extname: that treats a leading-dot name like ".gitignore" as
  // all-extension, which would strip the whole name away here.
  const lastDot = fileName.lastIndexOf(".");
  const hasExtension = lastDot > 0;

  const base = (hasExtension ? fileName.slice(0, lastDot) : fileName).replace(UNSAFE_KEY_CHARS, "");
  const extension = (hasExtension ? fileName.slice(lastDot + 1) : "").replace(UNSAFE_KEY_CHARS, "");

  // A fully non-ASCII name sanitizes down to nothing, and one that was all
  // Thai around dots ("แผน.ชั้น") down to dots alone — neither makes a
  // sensible key. The UUID prefix the caller adds is what actually makes the
  // key unique, so a constant fallback is safe.
  const safeBase = /[A-Za-z0-9_-]/.test(base) ? base : "file";

  return extension ? `${safeBase}.${extension}` : safeBase;
}
