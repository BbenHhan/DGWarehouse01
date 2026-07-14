"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { RoleRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { approveRoleRequest, denyRoleRequest } from "@/app/actions/users";

export function PendingRequestsList({ requests }: { requests: RoleRequest[] }) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visibleRequests = requests.filter((request) => !resolvedIds.has(request.id));

  function handleResolve(requestId: string, action: "approve" | "deny") {
    setPendingActionId(requestId);
    startTransition(async () => {
      const result =
        action === "approve" ? await approveRoleRequest(requestId) : await denyRoleRequest(requestId);
      setPendingActionId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setResolvedIds((prev) => new Set(prev).add(requestId));
      toast.success(action === "approve" ? "อนุมัติคำขอแล้ว" : "ปฏิเสธคำขอแล้ว");
    });
  }

  if (visibleRequests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-sm text-muted-foreground">
        ไม่มีคำขอสิทธิ์แก้ไขที่รอดำเนินการ
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visibleRequests.map((request) => (
        <li
          key={request.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {request.requesterFullName ?? request.requesterEmail}
            </p>
            {request.requesterFullName && (
              <p className="truncate text-xs text-muted-foreground">{request.requesterEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">
              ขอเมื่อ {new Date(request.requestedAt).toLocaleDateString("th-TH")}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingActionId === request.id}
              onClick={() => handleResolve(request.id, "deny")}
            >
              ปฏิเสธ
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pendingActionId === request.id}
              onClick={() => handleResolve(request.id, "approve")}
            >
              {pendingActionId === request.id ? "กำลังดำเนินการ..." : "อนุมัติ"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
