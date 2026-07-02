import { getRoomPhotoCounts, getRooms, getSiteStats } from "@/lib/data";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SidebarSwitcher } from "@/components/SidebarSwitcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [rooms, roomPhotoCounts, siteStats] = await Promise.all([
    getRooms(),
    getRoomPhotoCounts(),
    getSiteStats(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header stats={siteStats} />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 p-4 sm:p-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <Sidebar
            rooms={rooms}
            roomPhotoCounts={roomPhotoCounts}
            documentCount={siteStats.totalDocuments}
          />
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="md:hidden">
            <SidebarSwitcher
              rooms={rooms}
              roomPhotoCounts={roomPhotoCounts}
              documentCount={siteStats.totalDocuments}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
