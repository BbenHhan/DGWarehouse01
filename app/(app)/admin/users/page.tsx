import { requireRole } from "@/lib/supabase/server";
import { listAccounts, listPendingRoleRequests } from "@/app/actions/users";
import { UserRoleTable } from "@/components/UserRoleTable";
import { PendingRequestsList } from "@/components/PendingRequestsList";

export default async function AdminUsersPage() {
  try {
    await requireRole("admin");
  } catch {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center text-muted-foreground">
        <p className="font-medium">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="text-sm">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  const [accountsResult, requestsResult] = await Promise.all([
    listAccounts(),
    listPendingRoleRequests(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          จัดการผู้ใช้
        </h1>
        <p className="text-sm text-muted-foreground">
          เปลี่ยนสิทธิ์การใช้งานของแต่ละบัญชี
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">คำขอสิทธิ์แก้ไขที่รอดำเนินการ</h2>
        {requestsResult.ok ? (
          <PendingRequestsList requests={requestsResult.data} />
        ) : (
          <p className="text-sm text-destructive">{requestsResult.error}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">บัญชีทั้งหมด</h2>
        {accountsResult.ok ? (
          <UserRoleTable accounts={accountsResult.data} />
        ) : (
          <p className="text-sm text-destructive">{accountsResult.error}</p>
        )}
      </div>
    </div>
  );
}
