import { requireRole } from "@/lib/supabase/server";
import { getRooms, getWorkTypes } from "@/lib/data";
import { BulkUploadWorkspace } from "@/components/BulkUploadWorkspace";

export default async function BulkUploadPage() {
  try {
    await requireRole("editor");
  } catch {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
        <p className="font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="text-sm">หน้านี้สำหรับผู้แก้ไขและผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  const [rooms, workTypes] = await Promise.all([getRooms(), getWorkTypes()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          อัปโหลดรูปหลายไฟล์
        </h1>
        <p className="text-sm text-muted-foreground">
          เลือกช่วงวันที่ครั้งเดียว แล้วลากรูปแต่ละรูปไปยังห้องและหมวดงานที่ถูกต้อง
        </p>
      </div>

      <BulkUploadWorkspace rooms={rooms} workTypes={workTypes} />
    </div>
  );
}
