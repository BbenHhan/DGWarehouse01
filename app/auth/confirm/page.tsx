"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Click-to-confirm landing page for emailed auth links (sign-up confirmation,
// password reset) — specs/012-auth-link-prefetch-fix. The code exchange only
// happens inside handleConfirm's click handler, never on page load, so an
// email-security scanner's automated, non-interactive prefetch of this URL
// can't consume the one-time code before the real person clicks (research.md
// Decision 1). Google OAuth is unaffected — it still goes through
// app/auth/callback/route.ts directly, untouched by this feature.
export default function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/photos";
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  // Synchronous guard against a fast double-click firing handleConfirm twice
  // before the button's `disabled` state (a React state update, not
  // synchronous) takes effect — specs/013-confirm-session-check research.md
  // Decision 2.
  const inFlight = useRef(false);

  const supabase = createClient();

  async function handleConfirm() {
    if (inFlight.current) return;
    inFlight.current = true;

    if (!code) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Hard navigation — guarantees the next request carries the just-set
      // session cookie server-side (same pattern as every other auth flow
      // on this page's siblings, e.g. specs/006-email-password-auth).
      window.location.assign(next);
      return;
    }

    // The exchange call itself failed, but a session may already have been
    // established by a concurrent/earlier attempt with the same code (e.g.
    // the double-click the ref guard above now prevents, or some other
    // duplicate invocation) — check before concluding this is a genuine
    // failure (specs/013-confirm-session-check research.md Decision 1).
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      window.location.assign(next);
      return;
    }

    setStatus("error");
  }

  if (!code || status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm">
          ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง
        </p>
        <a href="/login" className="text-sm underline">
          กลับไปหน้าเข้าสู่ระบบ
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">ยืนยันการเข้าสู่ระบบ</h1>
          <p className="text-sm text-muted-foreground">
            กดยืนยันเพื่อดำเนินการต่อ
          </p>
        </div>

        <Button className="w-full" disabled={status === "loading"} onClick={handleConfirm}>
          {status === "loading" ? "กำลังยืนยัน..." : "ยืนยันและดำเนินการต่อ"}
        </Button>
      </div>
    </main>
  );
}
