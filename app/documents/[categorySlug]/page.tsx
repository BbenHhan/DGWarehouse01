import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocumentCategories, getDocuments } from "@/lib/data";
import { DocList } from "@/components/DocList";
import { DocUploader } from "@/components/DocUploader";

function tabClass(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-accent",
  ].join(" ");
}

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

  const documents = await getDocuments(currentCategory.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <nav className="flex flex-wrap gap-2 overflow-x-auto">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/documents/${category.slug}`}
            className={tabClass(category.slug === categorySlug)}
          >
            {category.emoji} {category.name_th}
          </Link>
        ))}
      </nav>
      <DocUploader categoryId={currentCategory.id} />
      <DocList documents={documents} />
    </div>
  );
}
