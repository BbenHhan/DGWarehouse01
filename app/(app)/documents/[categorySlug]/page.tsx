import { notFound } from "next/navigation";
import {
  getAllDocumentGroups,
  getDocumentCategories,
  getDocumentGroups,
  getDocuments,
} from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { DocList } from "@/components/DocList";
import { DocUploader } from "@/components/DocUploader";
import { categoryLabel } from "@/lib/taxonomy-label";

// Only the part that changes per category. The header, management panel and
// tab bar are in layout.tsx so they stay put while this reloads.
export default async function DocumentCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const categories = await getDocumentCategories();
  const currentCategory = categories.find((category) => category.slug === categorySlug);
  if (!currentCategory) {
    notFound();
  }

  const [documents, currentUser, documentGroups, allGroups] = await Promise.all([
    getDocuments(currentCategory.id),
    getCurrentUser(),
    getDocumentGroups(currentCategory.id),
    getAllDocumentGroups(),
  ]);

  const userCanEdit = currentUser ? roleCanEdit(currentUser.role) : false;
  const categoryMoveOptions = USE_MOCK_DATA
    ? []
    : categories.map((category) => ({
        value: category.id,
        label: `${category.emoji} ${categoryLabel(category)}`,
      }));

  return (
    <>
      {!USE_MOCK_DATA && userCanEdit && (
        <DocUploader
          categoryId={currentCategory.id}
          groups={documentGroups}
          category={currentCategory}
        />
      )}

      <div className="border-t border-border/70 pt-4">
        <DocList
          documents={documents}
          documentGroups={documentGroups}
          allGroups={allGroups}
          categories={categories}
          categoryId={currentCategory.id}
          categoryMoveOptions={categoryMoveOptions}
          canEdit={userCanEdit}
        />
      </div>
    </>
  );
}
