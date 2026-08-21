import { notFound } from "next/navigation";
import { getPhotos, getRoomPhotoCounts, getRooms, getWorkTypes } from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkTypePhotoNav } from "@/components/WorkTypePhotoNav";
import { PhotoDateFilter } from "@/components/PhotoDateFilter";
import { PhotoGrid } from "@/components/PhotoGrid";

export default async function RoomWorkTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ roomSlug: string; workTypeSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { roomSlug, workTypeSlug } = await params;
  const { from, to } = await searchParams;

  const [rooms, workTypes, roomPhotoCounts, currentUser] = await Promise.all([
    getRooms(),
    getWorkTypes(),
    getRoomPhotoCounts(),
    getCurrentUser(),
  ]);
  const userCanEdit = currentUser ? roleCanEdit(currentUser.role) : false;
  const currentRoom = rooms.find((room) => room.slug === roomSlug);
  const currentWorkType = workTypes.find((workType) => workType.slug === workTypeSlug);

  if (!currentRoom || !currentWorkType) {
    notFound();
  }

  // Mirrors Sidebar's grouping — ห้องย่อย 1-4 physically live under ❄️ ห้องเย็น.
  const roomGroupLabel = currentRoom.slug.startsWith("hong-soi-")
    ? "ห้องเย็น"
    : currentRoom.name_th;

  const photos = await getPhotos(currentRoom.id, currentWorkType.id, { from, to });

  // A photo can move to any room/work-type pair (FR-007) — every combination
  // is a move option, not just this page's own (specs/018-per-photo-dates,
  // replaces the old "move to a different week" list spanning every week).
  // Skipped entirely in mock mode (v1) since edit/upload UI is hidden there.
  const roomWorkTypeMoveOptions = USE_MOCK_DATA
    ? []
    : rooms.flatMap((room) =>
        workTypes.map((workType) => ({
          value: `${room.id}::${workType.id}`,
          label: `${room.emoji} ${room.name_th} · ${workType.emoji} ${workType.name_th}`,
        }))
      );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-xl shadow-[0_4px_18px_rgba(155,94,40,.3)]">
          {currentRoom.emoji}
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {currentRoom.name_th}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roomGroupLabel} · {roomPhotoCounts[currentRoom.id] ?? 0} รูป
          </p>
        </div>
      </div>

      <WorkTypePhotoNav
        workTypes={workTypes}
        currentRoomSlug={roomSlug}
        currentWorkTypeSlug={workTypeSlug}
      />

      <PhotoDateFilter />

      <div className="border-t border-border/70 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
            {photos.length} รูป
          </span>
        </div>
        <PhotoGrid photos={photos} moveOptions={roomWorkTypeMoveOptions} canEdit={userCanEdit} />
      </div>
    </div>
  );
}
