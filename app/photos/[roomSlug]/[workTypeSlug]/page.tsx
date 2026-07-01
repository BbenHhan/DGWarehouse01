import { notFound } from "next/navigation";
import { getPhotos, getRooms, getWeeks, getWorkTypes } from "@/lib/data";
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
      <PhotoGrid photos={photos} />
    </div>
  );
}
