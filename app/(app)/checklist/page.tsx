import { getChecklistItems, getRooms } from "@/lib/data";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { ChecklistList } from "@/components/ChecklistList";

export default async function ChecklistPage() {
  const [items, rooms, currentUser] = await Promise.all([
    getChecklistItems(),
    getRooms(),
    getCurrentUser(),
  ]);
  const userCanEdit = currentUser ? roleCanEdit(currentUser.role) : false;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-xl shadow-[0_4px_18px_rgba(155,94,40,.3)]">
          ✅
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">เช็คลิสต์</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} รายการ · {items.filter((item) => item.status !== "done").length} ยังไม่เสร็จ
          </p>
        </div>
      </div>

      <ChecklistList items={items} rooms={rooms} canEdit={userCanEdit} />
    </div>
  );
}
