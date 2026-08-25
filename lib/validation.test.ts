import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  PHOTO_MIME_TYPES,
  addChecklistItemSchema,
  deleteChecklistItemSchema,
  editChecklistItemSchema,
  setChecklistItemRoomStatusSchema,
  setChecklistItemStatusSchema,
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

// Room checklist schemas (specs/028-room-checklist through specs/032-
// checklist-detail-status-colors) — the guard every checklist Server Action
// runs before it touches a backend, so these cover the shapes a malformed
// client call could send, not just the happy path.
const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

describe("addChecklistItemSchema", () => {
  it("accepts free text with no rooms and no optional fields", () => {
    const result = addChecklistItemSchema.safeParse({ text: "ติดป้ายทางออก" });
    expect(result.success).toBe(true);
    expect(result.success && result.data.roomIds).toEqual([]);
  });

  it("accepts several room tags at once", () => {
    const result = addChecklistItemSchema.safeParse({
      text: "ตรวจไฟฉุกเฉิน",
      roomIds: ["hong-raek", "hong-klang"],
    });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace off the text", () => {
    const result = addChecklistItemSchema.safeParse({ text: "  ทาสี  " });
    expect(result.success && result.data.text).toBe("ทาสี");
  });

  it("rejects empty text", () => {
    expect(addChecklistItemSchema.safeParse({ text: "" }).success).toBe(false);
  });

  it("rejects whitespace-only text", () => {
    expect(addChecklistItemSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("accepts a uuid parentId for a sub-item", () => {
    const result = addChecklistItemSchema.safeParse({ text: "งานย่อย", parentId: UUID });
    expect(result.success).toBe(true);
  });

  it("rejects a parentId that isn't a uuid", () => {
    expect(addChecklistItemSchema.safeParse({ text: "งานย่อย", parentId: "hong-raek" }).success).toBe(false);
  });

  it("accepts optional detail and dates", () => {
    const result = addChecklistItemSchema.safeParse({
      text: "ตรวจระบบดับเพลิง",
      detail: "กรมโรงงานขอเอกสาร",
      startDate: "2026-09-01",
      dueDate: "2026-09-30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unparseable due date", () => {
    expect(addChecklistItemSchema.safeParse({ text: "งาน", dueDate: "not-a-date" }).success).toBe(false);
  });
});

describe("editChecklistItemSchema", () => {
  it("accepts a single-field edit", () => {
    expect(editChecklistItemSchema.safeParse({ id: UUID, text: "ข้อความใหม่" }).success).toBe(true);
  });

  it("accepts clearing detail and dates with null", () => {
    const result = editChecklistItemSchema.safeParse({ id: UUID, detail: null, startDate: null, dueDate: null });
    expect(result.success).toBe(true);
  });

  it("accepts replacing the room set with an empty list", () => {
    expect(editChecklistItemSchema.safeParse({ id: UUID, roomIds: [] }).success).toBe(true);
  });

  it("rejects an edit that names no field to change", () => {
    expect(editChecklistItemSchema.safeParse({ id: UUID }).success).toBe(false);
  });

  it("rejects blanking the text out", () => {
    expect(editChecklistItemSchema.safeParse({ id: UUID, text: "  " }).success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(editChecklistItemSchema.safeParse({ id: "hong-raek", text: "x" }).success).toBe(false);
  });
});

describe("setChecklistItemStatusSchema", () => {
  it.each(["todo", "in_progress", "done"])("accepts the %s status", (status) => {
    expect(setChecklistItemStatusSchema.safeParse({ id: UUID, status }).success).toBe(true);
  });

  it("rejects a status outside the three known states", () => {
    expect(setChecklistItemStatusSchema.safeParse({ id: UUID, status: "archived" }).success).toBe(false);
  });

  it("rejects the pre-specs/032 boolean shape", () => {
    expect(setChecklistItemStatusSchema.safeParse({ id: UUID, isDone: true }).success).toBe(false);
  });
});

describe("setChecklistItemRoomStatusSchema", () => {
  it("accepts a slug room id, since local/mock backends key rooms by slug", () => {
    const result = setChecklistItemRoomStatusSchema.safeParse({
      itemId: UUID,
      roomId: "hong-raek",
      status: "done",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty room id", () => {
    expect(setChecklistItemRoomStatusSchema.safeParse({ itemId: UUID, roomId: "", status: "done" }).success).toBe(false);
  });
});

describe("deleteChecklistItemSchema", () => {
  it("accepts a uuid", () => {
    expect(deleteChecklistItemSchema.safeParse({ id: UUID }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(deleteChecklistItemSchema.safeParse({}).success).toBe(false);
  });
});
