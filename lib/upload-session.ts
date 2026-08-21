// Splits files into chunks no larger than uploadPhoto's existing
// MAX_BATCH_FILES limit (lib/validation.ts) — research.md Decision 4 of
// specs/015-multi-upload-drag-sort. A mobile multi-select assignment of more
// than that many files must upload across multiple calls rather than
// exceeding the existing per-call cap.
//
// The week-resolution cache this file used to also export
// (WeekResolutionCache/weekResolutionKey/getOrResolveWeek) was removed by
// specs/018-per-photo-dates — uploading a photo no longer needs an async
// "resolve or create a container" step before it can proceed, so there is
// nothing left to de-dupe or cache.
export function chunkFiles(files: File[], maxPerChunk: number): File[][] {
  if (maxPerChunk <= 0) return [files];

  const chunks: File[][] = [];
  for (let i = 0; i < files.length; i += maxPerChunk) {
    chunks.push(files.slice(i, i + maxPerChunk));
  }
  return chunks;
}
