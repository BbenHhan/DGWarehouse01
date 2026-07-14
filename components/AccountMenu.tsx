"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, LogOut, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/roles";
import { isAdmin } from "@/lib/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";
import { requestEditorAccess } from "@/app/actions/users";

function initialsFor(name: string | null, email: string): string {
  const source = name?.trim() || email.split("@")[0];
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AccountMenu({
  email,
  name,
  avatarUrl,
  role,
  hasPendingRequest,
}: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  hasPendingRequest: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isRequesting, startRequestTransition] = useTransition();
  const [pending, setPending] = useState(hasPendingRequest);

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOut();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "ออกจากระบบไม่สำเร็จ");
      }
    });
  }

  function handleRequestEditorAccess() {
    startRequestTransition(async () => {
      const result = await requestEditorAccess();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPending(true);
      toast.success("ส่งคำขอสิทธิ์แก้ไขแล้ว");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" aria-label="เมนูบัญชีผู้ใช้" className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar>
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback>{initialsFor(name, email)}</AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-[200px] truncate font-normal text-muted-foreground">
            {name ?? email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin(role) && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link href="/admin/users">
                    <Users className="h-4 w-4" />
                    จัดการผู้ใช้
                  </Link>
                }
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        {role === "viewer" && (
          <>
            <DropdownMenuGroup>
              {pending ? (
                <DropdownMenuItem disabled>
                  <Clock className="h-4 w-4" />
                  คำขอสิทธิ์แก้ไขกำลังรอดำเนินการ
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={isRequesting} onClick={handleRequestEditorAccess}>
                  <UserPlus className="h-4 w-4" />
                  {isRequesting ? "กำลังส่งคำขอ..." : "ขอสิทธิ์แก้ไข"}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {isPending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
