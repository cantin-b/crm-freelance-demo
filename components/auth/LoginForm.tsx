"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/providers/UiLanguageProvider";

export function LoginForm() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setForgotMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/prospects");
      } else if (res.status === 401) {
        setError(t.login_invalid);
      } else {
        setError(t.login_error);
      }
    } catch {
      setError(t.login_error);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setForgotLoading(true);
    setForgotMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST" });
      if (res.ok) {
        setForgotMessage(t.login_forgot_sent);
      } else {
        const data = await res.json();
        if (res.status === 400) {
          setError(t.login_email_not_configured);
        } else {
          setError(data.error ?? t.login_error);
        }
      }
    } catch {
      setError(t.login_error);
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="Freelance CRM logo" width={140} height={48} priority unoptimized className="h-10 w-auto" />
        </div>

        <h1 className="mb-5 text-xl font-semibold text-zinc-900">{t.login_sign_in}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.login_email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t.login_password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {forgotMessage && (
            <p className="text-sm text-green-600">{forgotMessage}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.login_sign_in}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
          >
            {forgotLoading ? t.login_sending : t.login_forgot_password}
          </button>
        </div>
      </div>
    </div>
  );
}
