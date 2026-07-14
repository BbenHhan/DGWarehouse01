"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    // /auth/callback already exchanged the emailed link's code for a
    // (recovery) session before redirecting here — if there's no user by
    // the time we land, the link was invalid, expired, or already used
    // (specs/006-email-password-auth, FR-005).
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(data.user !== null);
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validatePassword(password);
    if (validationError) {
      setStatus("error");
      setErrorMessage(validationError);
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    // Hard navigation — guarantees the next request carries the now-fully
    // authenticated session cookie server-side (research.md Decision 3).
    window.location.assign("/photos");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">กำลังตรวจสอบลิงก์...</p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm">
          ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ตั้งรหัสผ่านใหม่
        </p>
        <a href="/login" className="text-sm underline">
          กลับไปหน้าเข้าสู่ระบบ
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-muted-foreground">
            ตั้งรหัสผ่านสำหรับบัญชีของคุณ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <PasswordInput
            required
            placeholder="รหัสผ่านใหม่"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}
          </Button>
          {status === "error" && (
            <p className="text-center text-sm text-destructive">{errorMessage}</p>
          )}
        </form>
      </div>
    </main>
  );
}
