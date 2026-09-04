import { USE_MOCK_DATA } from "@/lib/data-config";
import { canEdit as roleCanEdit } from "@/lib/roles";
import { getCurrentUser } from "@/lib/supabase/server";
import { ManageModeProvider } from "@/components/ManageModeProvider";

// The provider lives here rather than inside the category page on purpose
// (specs/040-editable-document-taxonomy).
//
// Switching category is a navigation between two `[categorySlug]` pages. A
// provider held inside the page unmounts on every one of those, so management
// mode switched itself off the moment you moved to another category — and the
// unsubmitted add-field text went with it. This layout is shared by every
// category, so it stays mounted across those navigations and the mode holds.
export default async function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();
  const canManage = !USE_MOCK_DATA && (currentUser ? roleCanEdit(currentUser.role) : false);

  return <ManageModeProvider canManage={canManage}>{children}</ManageModeProvider>;
}
