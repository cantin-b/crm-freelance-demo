"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Copy, Eye, EyeOff, Info, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/providers/UiLanguageProvider";

const DEMO_ACCOUNT = {
  id: "user-one",
  email: "userone@mail.com",
  password: "userone",
};

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
  const [demoBannerVisible, setDemoBannerVisible] = useState(true);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ key: string; status: "copied" | "manual" | "" }>({
    key: "",
    status: "",
  });

  useEffect(() => {
    if (!credentialsOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCredentialsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [credentialsOpen]);

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

  function handleUseAccount() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError(null);
    setForgotMessage(null);
    setCredentialsOpen(false);
  }

  async function handleCopy(value: string, key: string) {
    const showFeedback = (status: "copied" | "manual") => {
      setCopyFeedback({ key, status });
      setTimeout(() => setCopyFeedback({ key: "", status: "" }), 1800);
    };

    try {
      await navigator.clipboard.writeText(value);
      showFeedback("copied");
    } catch {
      showFeedback("manual");
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

      {demoBannerVisible && (
        <div className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-xl sm:bottom-5">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-[0_18px_48px_rgba(24,24,27,0.16)] ring-1 ring-white/80 backdrop-blur-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-[0_8px_18px_rgba(24,24,27,0.2)]">
              <Info className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950">{t.demo_access_available}</p>
              <p className="truncate text-xs text-zinc-500">{t.demo_access_description}</p>
            </div>
            <button
              type="button"
              onClick={() => setCredentialsOpen(true)}
              className="shrink-0 rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/25"
            >
              {t.demo_view_credentials}
            </button>
            <button
              type="button"
              onClick={() => setDemoBannerVisible(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
              aria-label={t.demo_close_banner}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {credentialsOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/35 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCredentialsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-credentials-title"
            className="w-full max-w-lg rounded-3xl border border-white/80 bg-white p-5 shadow-[0_28px_80px_rgba(24,24,27,0.26)] ring-1 ring-zinc-200/70 sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-[0_10px_24px_rgba(24,24,27,0.24)]">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="demo-credentials-title" className="text-lg font-semibold text-zinc-950">
                    {t.demo_credentials_title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {t.demo_credentials_description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
                aria-label={t.demo_close_credentials}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <article className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">{t.demo_user_one}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    {t.demo_user_one_description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseAccount}
                  className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/25"
                >
                  {t.demo_use_account}
                </button>
              </div>

              <CredentialLine
                label={t.login_email}
                value={DEMO_ACCOUNT.email}
                copyLabel={t.demo_copy}
                copiedLabel={t.demo_copied}
                manualLabel={t.demo_select}
                feedback={copyFeedback.key === "user-one-email" ? copyFeedback.status : ""}
                onCopy={() => handleCopy(DEMO_ACCOUNT.email, "user-one-email")}
              />
              <CredentialLine
                label={t.login_password}
                value={DEMO_ACCOUNT.password}
                copyLabel={t.demo_copy}
                copiedLabel={t.demo_copied}
                manualLabel={t.demo_select}
                feedback={copyFeedback.key === "user-one-password" ? copyFeedback.status : ""}
                onCopy={() => handleCopy(DEMO_ACCOUNT.password, "user-one-password")}
              />
            </article>
          </section>
        </div>
      )}
    </div>
  );
}

function CredentialLine({
  label,
  value,
  copyLabel,
  copiedLabel,
  manualLabel,
  feedback,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  manualLabel: string;
  feedback: "copied" | "manual" | "";
  onCopy: () => void;
}) {
  const copied = feedback === "copied";
  const manual = feedback === "manual";

  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
        <p className="mt-0.5 select-all truncate font-mono text-sm text-zinc-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-brand-navy/25 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            {copiedLabel}
          </>
        ) : manual ? (
          <>
            <Info className="h-3.5 w-3.5 text-amber-600" />
            {manualLabel}
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            {copyLabel}
          </>
        )}
      </button>
    </div>
  );
}
