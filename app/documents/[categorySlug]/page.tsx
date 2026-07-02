import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocumentCategories, getDocuments } from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { DocList } from "@/components/DocList";
import { DocUploader } from "@/components/DocUploader";

function tabClass(active: boolean) {
  return [
    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
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
  const categoryMoveOptions = USE_MOCK_DATA
    ? []
    : categories.map((category) => ({
        value: category.id,
        label: `${category.emoji} ${category.name_th}`,
      }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <div>
        <p className="text-xs font-medium text-muted-foreground">รายการเอกสาร</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {currentCategory.emoji} {currentCategory.name_th}
        </h1>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/documents/${category.slug}`}
            className={tabClass(category.slug === categorySlug)}
          >
            <span className="text-base leading-none">{category.emoji}</span>
            {category.name_th}
          </Link>
        ))}
      </nav>

      {!USE_MOCK_DATA && <DocUploader categoryId={currentCategory.id} />}

      <div className="border-t border-border/70 pt-4">
        <DocList documents={documents} categoryMoveOptions={categoryMoveOptions} />
      </div>
    </div>
  );
}
