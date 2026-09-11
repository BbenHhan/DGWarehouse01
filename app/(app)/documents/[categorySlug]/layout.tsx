import Link from "next/link";
import { Upload } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getAllDocumentGroups,
  getDocumentCategories,
  getDocumentCountsByCategory,
} from "@/lib/data";
import { USE_MOCK_DATA } from "@/lib/data-config";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CategoryManagePanel } from "@/components/CategoryManagePanel";
import { CategoryTabs } from "@/components/CategoryTabs";
import { ManageModeToggle } from "@/components/ManageModeProvider";
import { categoryLabel } from "@/lib/taxonomy-label";

// The header, the management panel and the tab bar live in the layout rather
// than the page so they survive a category switch. Each category is its own
// route, so with all of this in the page, clicking a tab took the tabs away
// with it — you lost the thing you were navigating with, mid-navigation. Now
// only the content below is replaced by loading.tsx while it loads.
export default async function DocumentCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const [categories, currentUser, allGroups, documentCounts] = await Promise.all([
    getDocumentCategories(),
    getCurrentUser(),
    getAllDocumentGroups(),
    getDocumentCountsByCategory(),
  ]);

  const currentCategory = categories.find((category) => category.slug === categorySlug);
  if (!currentCategory) {
    notFound();
  }

  const userCanEdit = currentUser ? roleCanEdit(currentUser.role) : false;

  return (
    <div className="flex flex-col gap-5">
      {/* Wraps rather than squeezing: at 375px the two buttons and a Thai
          category name cannot share one row, and without this the manage
          toggle ran 34px past the viewport with no way to scroll to it
          (specs/040 quickstart Scenario 10). The buttons take their own row
          below the title on a phone, and min-w-0 lets the title use the full
          width instead of collapsing into a three-line column. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-xl shadow-[0_4px_18px_rgba(155,94,40,.3)]">
          {currentCategory.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {categoryLabel(currentCategory)}
          </h1>
          <p className="text-sm text-muted-foreground">
            รายการเอกสาร · {documentCounts[currentCategory.id] ?? 0} ไฟล์
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          {/* nativeButton={false} because this renders as a link rather than a
              <button> — without it Base UI warns that native button semantics
              have been removed. */}
          {!USE_MOCK_DATA && userCanEdit && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href="/documents/upload">
                  <Upload className="h-4 w-4" />
                  อัปโหลดหลายไฟล์
                </Link>
              }
            />
          )}
          <ManageModeToggle />
        </div>
      </div>

      <CategoryManagePanel
        categories={categories}
        documentCounts={documentCounts}
        allGroups={allGroups}
      />

      <CategoryTabs categories={categories} activeSlug={categorySlug} />

      {children}
    </div>
  );
}
