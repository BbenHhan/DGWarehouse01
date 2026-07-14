"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Role } from "@/lib/roles";
import type { Account } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRole } from "@/app/actions/users";

const ROLE_LABEL: Record<Role, string> = {
  viewer: "ผู้ใช้งานทั่วไป (ดูอย่างเดียว)",
  editor: "ผู้แก้ไข",
  admin: "ผู้ดูแลระบบ",
};

const ROLE_OPTIONS: Role[] = ["viewer", "editor", "admin"];

export function UserRoleTable({ accounts }: { accounts: Account[] }) {
  const [roles, setRoles] = useState<Record<string, Role>>(
    Object.fromEntries(accounts.map((account) => [account.id, account.role]))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter(
      (account) =>
        account.email.toLowerCase().includes(query) ||
        account.full_name?.toLowerCase().includes(query)
    );
  }, [accounts, search]);

  function handleRoleChange(accountId: string, newRole: Role) {
    const previousRole = roles[accountId];
    setRoles((prev) => ({ ...prev, [accountId]: newRole }));
    setPendingId(accountId);

    startTransition(async () => {
      const result = await updateUserRole(accountId, newRole);
      setPendingId(null);
      if (!result.ok) {
        setRoles((prev) => ({ ...prev, [accountId]: previousRole }));
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="ค้นหาด้วยอีเมลหรือชื่อ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredAccounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-sm text-muted-foreground">
          ไม่พบบัญชีที่ตรงกัน
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredAccounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {account.full_name ?? account.email}
                </p>
                {account.full_name && (
                  <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  สมัครเมื่อ {new Date(account.created_at).toLocaleDateString("th-TH")}
                </p>
              </div>

              <Select
                value={roles[account.id]}
                onValueChange={(value) => value !== null && handleRoleChange(account.id, value as Role)}
              >
                <SelectTrigger className="w-[200px]" disabled={pendingId === account.id}>
                  <SelectValue>{(value: Role) => ROLE_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
