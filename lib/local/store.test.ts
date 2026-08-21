import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCAL_FILES_DIR,
  localDeletePhoto,
  localGetPhotos,
  localSavePhotoFile,
  localUpdatePhoto,
} from "@/lib/local/store";

// vitest.setup.ts points LOCAL_BASE_DIR/LOCAL_FILES_DIR at a disposable temp
// directory for this whole run — never the developer's real .local-data/
// (specs/005-automated-testing FR-003). Each test creates its own room/
// work-type id pair so tests don't see each other's photos.
let testId: number;
beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
});

function roomWorkType() {
  return { roomId: `test-room-${testId}`, workTypeId: `test-work-type-${testId}` };
}

describe("localSavePhotoFile / localGetPhotos", () => {
  it("saves a photo with its room/work-type/date and returns it via localGetPhotos", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const file = new File(["hello"], "test.jpg", { type: "image/jpeg" });
    const photo = await localSavePhotoFile(roomId, workTypeId, "2026-06-10", file);

    const absolutePath = path.join(LOCAL_FILES_DIR, photo.storage_path);
    expect(existsSync(absolutePath)).toBe(true);

    const photos = await localGetPhotos(roomId, workTypeId);
    expect(photos).toHaveLength(1);
    expect(photos[0].date).toBe("2026-06-10");
  });

  it("orders photos by date descending, regardless of upload order", async () => {
    const { roomId, workTypeId } = roomWorkType();
    await localSavePhotoFile(roomId, workTypeId, "2026-06-10", new File(["a"], "a.jpg", { type: "image/jpeg" }));
    await localSavePhotoFile(roomId, workTypeId, "2026-06-01", new File(["b"], "b.jpg", { type: "image/jpeg" }));
    await localSavePhotoFile(roomId, workTypeId, "2026-06-20", new File(["c"], "c.jpg", { type: "image/jpeg" }));

    const photos = await localGetPhotos(roomId, workTypeId);
    expect(photos.map((p) => p.date)).toEqual(["2026-06-20", "2026-06-10", "2026-06-01"]);
  });

  it("applies an optional date-range filter", async () => {
    const { roomId, workTypeId } = roomWorkType();
    await localSavePhotoFile(roomId, workTypeId, "2026-06-01", new File(["a"], "a.jpg", { type: "image/jpeg" }));
    await localSavePhotoFile(roomId, workTypeId, "2026-06-10", new File(["b"], "b.jpg", { type: "image/jpeg" }));
    await localSavePhotoFile(roomId, workTypeId, "2026-06-20", new File(["c"], "c.jpg", { type: "image/jpeg" }));

    const filtered = await localGetPhotos(roomId, workTypeId, { from: "2026-06-05", to: "2026-06-15" });
    expect(filtered.map((p) => p.date)).toEqual(["2026-06-10"]);
  });

  it("returns an empty list for a room/work-type with no photos", async () => {
    const { roomId, workTypeId } = roomWorkType();
    expect(await localGetPhotos(roomId, workTypeId)).toHaveLength(0);
  });
});

describe("localDeletePhoto", () => {
  it("removes the file from disk and the photo from the list", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const photo = await localSavePhotoFile(roomId, workTypeId, "2026-06-08", new File(["hi"], "a.jpg", { type: "image/jpeg" }));
    const absolutePath = path.join(LOCAL_FILES_DIR, photo.storage_path);

    await localDeletePhoto(photo.id);

    expect(existsSync(absolutePath)).toBe(false);
    expect(await localGetPhotos(roomId, workTypeId)).toHaveLength(0);
  });
});

describe("localUpdatePhoto", () => {
  it("updates a photo's date", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const photo = await localSavePhotoFile(roomId, workTypeId, "2026-06-08", new File(["hi"], "a.jpg", { type: "image/jpeg" }));

    const updated = await localUpdatePhoto(photo.id, { date: "2026-07-01" });
    expect(updated?.date).toBe("2026-07-01");
  });

  it("moves a photo to a different room/work-type", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const photo = await localSavePhotoFile(roomId, workTypeId, "2026-06-08", new File(["hi"], "a.jpg", { type: "image/jpeg" }));

    const newRoomId = `${roomId}-other`;
    await localUpdatePhoto(photo.id, { roomId: newRoomId });

    expect(await localGetPhotos(roomId, workTypeId)).toHaveLength(0);
    expect(await localGetPhotos(newRoomId, workTypeId)).toHaveLength(1);
  });
});
