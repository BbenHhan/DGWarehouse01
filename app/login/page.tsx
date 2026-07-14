"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const GENERIC_SIGN_IN_ERROR = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const GENERIC_RESET_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const GENERIC_SIGN_UP_ERROR = "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const EXPIRED_LINK_ERROR = "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาลองเข้าสู่ระบบอีกครั้ง";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpStatus, setSignUpStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [signUpError, setSignUpError] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // /auth/callback redirects here with ?error=auth when a magic-link/OAuth/
  // password-reset code exchange fails (expired or already-used link) —
  // surface that instead of a silently blank form (Constitution V; FR-005).
  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setStatus("error");
      setErrorMessage(EXPIRED_LINK_ERROR);
    }
  }, [searchParams]);

  const supabase = createClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMessage(GENERIC_SIGN_IN_ERROR);
      return;
    }

    // Hard navigation, not router.push — guarantees the very next request
    // carries the just-set session cookie server-side (specs/006-email-password-auth).
    window.location.assign("/photos");
  }

  // Real open sign-up (specs/007-role-based-access FR-001) — the account
  // that gets created here lands as "viewer" automatically via the
  // on_auth_user_created DB trigger, not anything decided here.
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validatePassword(signUpPassword);
    if (validationError) {
      setSignUpStatus("error");
      setSignUpError(validationError);
      return;
    }

    setSignUpStatus("loading");
    setSignUpError("");

    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (error) {
      setSignUpStatus("error");
      setSignUpError(error.message || GENERIC_SIGN_UP_ERROR);
      return;
    }

    if (data.session) {
      // Email confirmation is off on this project — signed in immediately.
      window.location.assign("/photos");
      return;
    }

    // Email confirmation required — same "check your email" pattern as the
    // reset-link flow, and for the same reason (don't reveal whether an
    // email already had an account).
    setSignUpStatus("sent");
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetStatus("sending");

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    // Same confirmation regardless of whether the email has an account —
    // Supabase's own response already avoids revealing that (research.md
    // Decision 5); a populated error here means a real failure (rate limit,
    // network), not "no such account".
    if (error) {
      setResetStatus("error");
      return;
    }

    setResetStatus("sent");
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
          <h1 className="text-2xl font-semibold">
            {mode === "signup" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </h1>
          <p className="text-sm text-muted-foreground">
            ติดตามความคืบหน้า DG Warehouse 01
          </p>
        </div>

        {mode === "forgot" &&
          (resetStatus === "sent" ? (
            <p className="text-center text-sm">
              หากอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านไปให้แล้ว กรุณาตรวจสอบอีเมลของคุณ
            </p>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="อีเมลของคุณ"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={resetStatus === "sending"}>
                {resetStatus === "sending" ? "กำลังส่งลิงก์..." : "ส่งลิงก์ตั้งรหัสผ่าน"}
              </Button>
              {resetStatus === "error" && (
                <p className="text-center text-sm text-destructive">{GENERIC_RESET_ERROR}</p>
              )}
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline"
                onClick={() => setMode("signin")}
              >
                กลับไปเข้าสู่ระบบ
              </button>
            </form>
          ))}

        {mode === "signup" &&
          (signUpStatus === "sent" ? (
            <p className="text-center text-sm">
              ส่งลิงก์ยืนยันไปที่ {signUpEmail} แล้ว กรุณาตรวจสอบอีเมลของคุณเพื่อเริ่มใช้งาน
            </p>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="อีเมลของคุณ"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
              />
              <PasswordInput
                required
                placeholder="ตั้งรหัสผ่าน"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={signUpStatus === "loading"}>
                {signUpStatus === "loading" ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>
              {signUpStatus === "error" && (
                <p className="text-center text-sm text-destructive">{signUpError}</p>
              )}
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline"
                onClick={() => setMode("signin")}
              >
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </button>
            </form>
          ))}

        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="อีเมลของคุณ"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput
              required
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
            {status === "error" && (
              <p className="text-center text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => {
                  setResetEmail(email);
                  setResetStatus("idle");
                  setMode("forgot");
                }}
              >
                ลืมรหัสผ่าน?
              </button>
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => {
                  setSignUpEmail(email);
                  setSignUpStatus("idle");
                  setMode("signup");
                }}
              >
                สมัครสมาชิก
              </button>
            </div>
          </form>
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
