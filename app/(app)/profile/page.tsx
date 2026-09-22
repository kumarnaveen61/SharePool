"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

type Me = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    apiFetch<{ user: Me }>("/api/auth/me")
      .then(({ user }) => setMe(user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load.");
      });
  }, [router]);

  async function resendVerification() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      setResendSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  }

  async function logoutEverywhere() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/logout-everywhere", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md">
        <p className="rounded-xl border border-red/30 bg-red-bg px-4 py-3 text-sm text-red">
          {error}
        </p>
        <Link
          href="/login"
          className="mt-4 block text-center text-xs font-bold text-gold hover:underline"
        >
          Sign in again →
        </Link>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-md">
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Profile card */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-lg font-extrabold text-gold">
            {initialsFor(me.name)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {me.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted">{me.email}</p>
            {me.role === "SUPER_ADMIN" && (
              <span className="mt-2 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-gold">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Email verification */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
          <div>
            <div className="text-xs font-bold">Email status</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {me.emailVerified
                ? "Verified and confirmed"
                : "Please verify to enable all features"}
            </div>
          </div>
          {me.emailVerified ? (
            <span className="rounded-full bg-teal-bg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal">
              ✓ Verified
            </span>
          ) : (
            <button
              onClick={resendVerification}
              disabled={busy}
              className="rounded-xl bg-gold px-3.5 py-2 text-[11px] font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:opacity-60"
            >
              {resendSent ? "Sent ✓" : "Verify now"}
            </button>
          )}
        </div>
      </div>

      {/* Admin links */}
      {me.role === "SUPER_ADMIN" && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-4">
            <div className="text-sm font-extrabold">Admin tools</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Platform-wide controls
            </div>
          </div>
          <div className="space-y-2">
            <Link
              href="/platform/groups"
              className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40"
            >
              <span>Manage groups</span>
              <span className="text-muted">→</span>
            </Link>
              <Link
              href="/platform/providers"
              className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40"
            >
              <span>Manage providers</span>
              <span className="text-muted">→</span>
            </Link>
            <Link
              href="/platform/analytics"
              className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40"
            >
              <span>Platform analytics</span>
              <span className="text-muted">→</span>
            </Link>
            <Link
              href="/platform/health"
              className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40"
            >
              <span>System health</span>
              <span className="text-muted">→</span>
            </Link>
            <Link
              href="/platform/launch-checklist"
              className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40"
            >
              <span>Launch checklist</span>
              <span className="text-muted">→</span>
            </Link>
          </div>
        </div>
      )}

            {/* How it works */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div>
          <div className="text-sm font-extrabold">How SharePool works</div>
          <div className="mt-0.5 text-[11px] text-muted">
            Simple, private, built around trust.
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {[
            {
              n: "01",
              t: "Find",
              d: "Discover subscriptions shared by people you trust.",
            },
            {
              n: "02",
              t: "Request",
              d: "Ask for an available slot and wait for approval.",
            },
            {
              n: "03",
              t: "Share",
              d: "Coordinate access and payments within your group.",
            },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-[11px] font-extrabold text-gold">
                {s.n}
              </div>
              <div>
                <div className="text-xs font-extrabold">{s.t}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {s.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4">
          <div className="text-sm font-extrabold">Security</div>
          <div className="mt-0.5 text-[11px] text-muted">
            Session and access controls
          </div>
        </div>

        <button
          onClick={logout}
          disabled={busy}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-xs font-bold transition-colors hover:border-gold/40 disabled:opacity-60"
        >
          <span>Sign out on this device</span>
          <span className="text-muted">→</span>
        </button>

        <button
          onClick={logoutEverywhere}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-between rounded-2xl border border-red/30 bg-red-bg/30 px-4 py-3 text-xs font-bold text-red transition-colors hover:bg-red-bg disabled:opacity-60"
        >
          <span>Sign out of all devices</span>
          <span>→</span>
        </button>

        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          Use &ldquo;all devices&rdquo; if you think your account may be
          compromised. You&apos;ll need to sign back in here too.
        </p>
      </div>
    </div>
  );
}