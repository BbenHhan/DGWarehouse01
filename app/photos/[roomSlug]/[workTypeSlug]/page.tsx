import { notFound } from "next/navigation";
import { getAllWeeks, getPhotos, getRooms, getWeeks, getWorkTypes } from "@/lib/data";
import { RoomWorkTypeNav } from "@/components/RoomWorkTypeNav";
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

  const [rooms, workTypes] = await Promise.all([getRooms(), getWorkTypes()]);
  const currentRoom = rooms.find((room) => room.slug === roomSlug);
  const currentWorkType = workTypes.find((workType) => workType.slug === workTypeSlug);

  if (!currentRoom || !currentWorkType) {
    notFound();
  }

  const weeks = await getWeeks(currentRoom.id, currentWorkType.id);
  const selectedWeek = weeks.find((week) => week.id === weekIdParam) ?? weeks[weeks.length - 1];
  const photos = selectedWeek ? await getPhotos(selectedWeek.id) : [];

  // Photos can move to any room/work-type/week (FR-008), so the EditModal
  // "move to" list spans every week, not just this room/work-type's.
  const allWeeks = await getAllWeeks();
  const weekMoveOptions = allWeeks.map((week) => {
    const room = rooms.find((r) => r.id === week.room_id);
    const workType = workTypes.find((w) => w.id === week.work_type_id);
    return {
      value: week.id,
      label: `${room?.emoji ?? ""} ${room?.name_th ?? ""} · ${workType?.emoji ?? ""} ${workType?.name_th ?? ""} · ${week.label}`,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <RoomWorkTypeNav
        rooms={rooms}
        workTypes={workTypes}
        weeks={weeks}
        currentRoomSlug={roomSlug}
        currentWorkTypeSlug={workTypeSlug}
        selectedWeekId={selectedWeek?.id}
      />
      <div className="flex flex-wrap items-center gap-2">
        {selectedWeek && <PhotoUploader weekId={selectedWeek.id} />}
        <AddWeekButton roomId={currentRoom.id} workTypeId={currentWorkType.id} />
      </div>
      <PhotoGrid photos={photos} weekMoveOptions={weekMoveOptions} />
    </div>
  );
}
