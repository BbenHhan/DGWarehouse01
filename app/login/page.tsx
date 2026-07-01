"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handleGoogleSignIn() {
    setErrorMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
          <p className="text-sm text-muted-foreground">
            ติดตามความคืบหน้า DG Warehouse 01
          </p>
        </div>

        {status === "sent" ? (
          <p className="text-center text-sm">
            ส่งลิงก์เข้าสู่ระบบไปที่ {email} แล้ว กรุณาตรวจสอบอีเมลของคุณ
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="อีเมลของคุณ"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={status === "sending"}>
              {status === "sending" ? "กำลังส่งลิงก์..." : "ส่งลิงก์เข้าสู่ระบบ"}
            </Button>
          </form>
        )}

        {errorMessage && (
          <p className="text-center text-sm text-destructive">{errorMessage}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          หรือ
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
          เข้าสู่ระบบด้วย Google
        </Button>
      </div>
    </main>
  );
}
