import { notFound } from "next/navigation";
import { getAllWeeks, getPhotos, getRoomPhotoCounts, getRooms, getWeeks, getWorkTypes } from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { formatWeekDateRangeOrNull } from "@/lib/week-format";
import { WorkTypeWeekNav } from "@/components/WorkTypeWeekNav";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { AddWeekButton } from "@/components/AddWeekButton";

export default async function RoomWorkTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ roomSlug: string; workTypeSlug: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { roomSlug, workTypeSlug } = await params;
  const { week: weekIdParam } = await searchParams;

  const [rooms, workTypes, roomPhotoCounts] = await Promise.all([
    getRooms(),
    getWorkTypes(),
    getRoomPhotoCounts(),
  ]);
  const currentRoom = rooms.find((room) => room.slug === roomSlug);
  const currentWorkType = workTypes.find((workType) => workType.slug === workTypeSlug);

  if (!currentRoom || !currentWorkType) {
    notFound();
  }

  // Mirrors Sidebar's grouping — ห้องย่อย 1-4 physically live under ❄️ ห้องเย็น.
  const roomGroupLabel = currentRoom.slug.startsWith("hong-soi-")
    ? "ห้องเย็น"
    : currentRoom.name_th;

  const weeks = await getWeeks(currentRoom.id, currentWorkType.id);
  // Fetch every week's photos once so the timeline can show which weeks
  // actually have content (v7's "has-photos" gold dot) without a second
  // round trip for the selected week.
  const weeksWithPhotos = await Promise.all(
    weeks.map(async (week) => ({ week, photos: await getPhotos(week.id) }))
  );
  const selectedEntry =
    weeksWithPhotos.find((entry) => entry.week.id === weekIdParam) ??
    weeksWithPhotos[weeksWithPhotos.length - 1];
  const selectedWeek = selectedEntry?.week;
  const photos = selectedEntry?.photos ?? [];

  // Photos can move to any room/work-type/week (FR-008), so the EditModal
  // "move to" list spans every week, not just this room/work-type's.
  // Skipped entirely in mock mode (v1) since edit/upload UI is hidden there.
  const weekMoveOptions = USE_MOCK_DATA
    ? []
    : (await getAllWeeks()).map((week) => {
        const room = rooms.find((r) => r.id === week.room_id);
        const workType = workTypes.find((w) => w.id === week.work_type_id);
        const weekLabel = formatWeekDateRangeOrNull(week) ?? week.label;
        return {
          value: week.id,
          label: `${room?.emoji ?? ""} ${room?.name_th ?? ""} · ${workType?.emoji ?? ""} ${workType?.name_th ?? ""} · ${weekLabel}`,
        };
      });

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

      <WorkTypeWeekNav
        workTypes={workTypes}
        weeks={weeksWithPhotos.map(({ week, photos: weekPhotos }) => ({
          week,
          photoCount: weekPhotos.length,
        }))}
        currentRoomSlug={roomSlug}
        currentWorkTypeSlug={workTypeSlug}
        selectedWeekId={selectedWeek?.id}
        showActions={!USE_MOCK_DATA}
      />

      {!USE_MOCK_DATA && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedWeek && <PhotoUploader weekId={selectedWeek.id} />}
          <AddWeekButton roomId={currentRoom.id} workTypeId={currentWorkType.id} />
        </div>
      )}

      <div className="border-t border-border/70 pt-4">
        {selectedWeek && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">
              {photos.length} รูป
            </span>
            <span className="text-muted-foreground">{selectedWeek.label}</span>
          </div>
        )}
        <PhotoGrid photos={photos} weekMoveOptions={weekMoveOptions} />
      </div>
    </div>
  );
}
