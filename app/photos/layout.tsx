import { getRooms } from "@/lib/data";
import { RoomNav } from "@/components/RoomNav";
import { RoomSwitcher } from "@/components/RoomSwitcher";

export default async function PhotosLayout({ children }: { children: React.ReactNode }) {
  const rooms = await getRooms();

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 p-4 sm:p-6">
      <aside className="hidden w-52 shrink-0 md:block">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          ห้อง
        </p>
        <RoomNav rooms={rooms} />
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        <div className="md:hidden">
          <RoomSwitcher rooms={rooms} />
        </div>
        {children}
      </div>
    </div>
  );
}
