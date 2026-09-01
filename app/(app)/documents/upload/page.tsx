import Link from "next/link";
import { requireRole } from "@/lib/supabase/server";
import { getAllDocumentGroups, getDocumentCategories } from "@/lib/data";
import { DocumentUploadWorkspace } from "@/components/DocumentUploadWorkspace";

// The document counterpart of /upload (specs/015-multi-upload-drag-sort's photo
// workspace): drop a pile of files in, then drag each onto the sub-group it
// belongs to. Kept as its own page rather than folded into the category page —
// the bins need the room, and the inline uploader there is still the faster
// path for a single file.
export default async function DocumentBulkUploadPage() {
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

  const [categories, groups] = await Promise.all([getDocumentCategories(), getAllDocumentGroups()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          อัปโหลดเอกสารหลายไฟล์
        </h1>
        <p className="text-sm text-muted-foreground">
          ลากไฟล์มาวางในถาด แล้วลากแต่ละไฟล์ไปยังหมวดย่อยที่ถูกต้อง
        </p>
      </div>

      <DocumentUploadWorkspace categories={categories} groups={groups} />

      <p className="text-sm text-muted-foreground">
        ต้องการเพิ่มหรือแก้ชื่อหมวดย่อย?{" "}
        <Link href="/documents" className="text-primary underline underline-offset-2">
          จัดการได้ในหน้ารายการเอกสาร
        </Link>
      </p>
    </div>
  );
}
