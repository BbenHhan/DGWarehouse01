import { redirect } from "next/navigation";
import { getDocumentCategories } from "@/lib/data";

export default async function DocumentsIndexPage() {
  const categories = await getDocumentCategories();
  const firstCategory = categories[0];

  if (!firstCategory) {
    return (
      <p className="p-6 text-center text-muted-foreground">
        ยังไม่มีหมวดเอกสาร กรุณาตั้งค่าฐานข้อมูลก่อน
      </p>
    );
  }

  redirect(`/documents/${firstCategory.slug}`);
}
