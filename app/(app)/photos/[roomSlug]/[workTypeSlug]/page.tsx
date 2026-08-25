import { notFound } from "next/navigation";
import { getPhotos, getRoomChecklistItems, getRoomPhotoCounts, getRooms, getWorkTypes } from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkTypePhotoNav } from "@/components/WorkTypePhotoNav";
import { PhotoDateFilter } from "@/components/PhotoDateFilter";
import { PhotoGrid } from "@/components/PhotoGrid";
import { RoomChecklistBox } from "@/components/RoomChecklistBox";

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

  const [photos, roomChecklistItems] = await Promise.all([
    getPhotos(currentRoom.id, currentWorkType.id, { from, to }),
    getRoomChecklistItems(currentRoom.id),
  ]);

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

      {/* Two-column on desktop (content + a fixed-width checklist rail); the
          checklist box moves above the work-type tabs on mobile instead of
          sitting beside them (specs/028-room-checklist US3). */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="order-2 flex flex-col gap-5 lg:order-1">
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

        <div className="order-1 lg:order-2">
          <RoomChecklistBox
            roomId={currentRoom.id}
            roomSlug={currentRoom.slug}
            items={roomChecklistItems}
            canEdit={userCanEdit}
          />
        </div>
      </div>
    </div>
  );
}
