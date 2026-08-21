import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  PHOTO_MIME_TYPES,
  uploadPhotoSchema,
  validateFile,
} from "@/lib/validation";

function fakeFile(name: string, type: string, size: number): File {
  const file = new File([""], name, { type });
  // Real File.size is derived from actual content; overriding it here avoids
  // allocating a real 300MB+ buffer just to test the size-limit branch.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFile", () => {
  it("accepts an allowed image MIME type under the size limit", () => {
    const file = fakeFile("photo.jpg", "image/jpeg", 1024);
    expect(validateFile(file, PHOTO_MIME_TYPES)).toBeNull();
  });

  it("accepts an allowed PDF and video MIME type", () => {
    expect(validateFile(fakeFile("doc.pdf", "application/pdf", 1024), PHOTO_MIME_TYPES)).toBeNull();
    expect(validateFile(fakeFile("clip.mp4", "video/mp4", 1024), PHOTO_MIME_TYPES)).toBeNull();
  });

  it("rejects a disallowed MIME type, naming the file", () => {
    const file = fakeFile("virus.exe", "application/x-msdownload", 1024);
    const error = validateFile(file, PHOTO_MIME_TYPES);
    expect(error).not.toBeNull();
    expect(error).toContain("virus.exe");
  });

  it("rejects a file over the size limit", () => {
    const file = fakeFile("huge.mp4", "video/mp4", MAX_FILE_SIZE_BYTES + 1);
    const error = validateFile(file, PHOTO_MIME_TYPES);
    expect(error).not.toBeNull();
    expect(error).toContain("huge.mp4");
  });

  it("accepts a file exactly at the size limit", () => {
    const file = fakeFile("exact.mp4", "video/mp4", MAX_FILE_SIZE_BYTES);
    expect(validateFile(file, PHOTO_MIME_TYPES)).toBeNull();
  });
});

describe("uploadPhotoSchema", () => {
  const base = { roomId: "hong-raek", workTypeId: "firewalls" };
  const files = [new File(["x"], "a.jpg", { type: "image/jpeg" })];

  it("accepts a valid date with room/work-type/files", () => {
    const result = uploadPhotoSchema.safeParse({ ...base, date: "2026-06-08", files });
    expect(result.success).toBe(true);
  });

  it("rejects a missing date", () => {
    const result = uploadPhotoSchema.safeParse({ ...base, date: "", files });
    expect(result.success).toBe(false);
  });

  it("rejects an unparseable date", () => {
    const result = uploadPhotoSchema.safeParse({ ...base, date: "not-a-date", files });
    expect(result.success).toBe(false);
  });
});
