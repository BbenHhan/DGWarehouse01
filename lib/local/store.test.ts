import { existsSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCAL_FILES_DIR,
  localCreateWeek,
  localDeletePhoto,
  localDeleteWeek,
  localGetPhotos,
  localGetWeeks,
  localSavePhotoFile,
} from "@/lib/local/store";

// vitest.setup.ts points LOCAL_BASE_DIR/LOCAL_FILES_DIR at a disposable temp
// directory for this whole run — never the developer's real .local-data/
// (specs/005-automated-testing FR-003). Each test creates its own room/
// work-type id pair so tests don't see each other's weeks.
let testId: number;
beforeEach(() => {
  testId = Math.floor(Math.random() * 1_000_000);
});

function roomWorkType() {
  return { roomId: `test-room-${testId}`, workTypeId: `test-work-type-${testId}` };
}

describe("localDeleteWeek (cascading delete)", () => {
  it("deletes the week, its photo rows, and their underlying files", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const week = await localCreateWeek(roomId, workTypeId, "2026-06-08", "2026-06-15");

    const file = new File(["hello"], "test.jpg", { type: "image/jpeg" });
    const photo = await localSavePhotoFile(week.id, file);
    const absolutePath = path.join(LOCAL_FILES_DIR, photo.storage_path);
    expect(existsSync(absolutePath)).toBe(true);

    const removed = await localDeleteWeek(week.id);
    expect(removed?.id).toBe(week.id);

    const remainingWeeks = await localGetWeeks(roomId, workTypeId);
    expect(remainingWeeks).toHaveLength(0);

    const remainingPhotos = await localGetPhotos(week.id);
    expect(remainingPhotos).toHaveLength(0);

    expect(existsSync(absolutePath)).toBe(false);
  });

  it("deletes an empty week (no photos) without error", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const week = await localCreateWeek(roomId, workTypeId, "2026-06-08", "2026-06-15");

    const removed = await localDeleteWeek(week.id);
    expect(removed?.id).toBe(week.id);
    expect(await localGetWeeks(roomId, workTypeId)).toHaveLength(0);
  });

  it("returns null for a week that doesn't exist", async () => {
    const removed = await localDeleteWeek("does-not-exist");
    expect(removed).toBeNull();
  });
});

describe("localGetWeeks (chronological sort)", () => {
  it("returns weeks ordered by start_date ascending, regardless of creation order", async () => {
    const { roomId, workTypeId } = roomWorkType();

    await localCreateWeek(roomId, workTypeId, "2026-06-22", "2026-06-29"); // created 1st, dated 2nd
    await localCreateWeek(roomId, workTypeId, "2026-05-25", "2026-06-01"); // created 2nd, dated 1st
    await localCreateWeek(roomId, workTypeId, "2026-07-06", "2026-07-13"); // created 3rd, dated 3rd

    const weeks = await localGetWeeks(roomId, workTypeId);
    expect(weeks.map((w) => w.start_date)).toEqual(["2026-05-25", "2026-06-22", "2026-07-06"]);
  });
});

describe("localDeletePhoto", () => {
  it("removes the file from disk", async () => {
    const { roomId, workTypeId } = roomWorkType();
    const week = await localCreateWeek(roomId, workTypeId, "2026-06-08", "2026-06-15");
    const photo = await localSavePhotoFile(week.id, new File(["hi"], "a.jpg", { type: "image/jpeg" }));
    const absolutePath = path.join(LOCAL_FILES_DIR, photo.storage_path);

    await localDeletePhoto(photo.id);

    expect(existsSync(absolutePath)).toBe(false);
    expect(await localGetPhotos(week.id)).toHaveLength(0);
  });
});
