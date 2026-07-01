import { redirect } from "next/navigation";
import { getRooms, getWorkTypes } from "@/lib/data";

export default async function PhotosIndexPage() {
  const [rooms, workTypes] = await Promise.all([getRooms(), getWorkTypes()]);
  const firstRoom = rooms[0];
  const firstWorkType = workTypes[0];

  if (!firstRoom || !firstWorkType) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        ยังไม่มีข้อมูลห้องหรือประเภทงาน กรุณาตั้งค่าฐานข้อมูลก่อน
      </p>
    );
  }

  redirect(`/photos/${firstRoom.slug}/${firstWorkType.slug}`);
}
