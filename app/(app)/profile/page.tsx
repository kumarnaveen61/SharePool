"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api-client";

type Me = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    apiFetch<{ user: Me }>("/api/auth/me")
      .then(({ user }) => setMe(user))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load."));
  }, []);

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

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!me) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand">
          {me.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-ink">{me.name}</h1>
          <p className="mt-0.5 text-sm text-muted">{me.email}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Email verification</span>
          {me.emailVerified ? (
            <span className="text-success">Verified</span>
          ) : (
            <button
              onClick={resendVerification}
              disabled={busy}
              className="font-medium text-brand"
            >
              {resendSent ? "Link sent" : "Verify now"}
            </button>
          )}
        </div>
      </div>

      {me.role === "SUPER_ADMIN" && (
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/platform/analytics"
            className="block rounded-xl border border-border bg-surface p-4 text-sm font-medium text-ink hover:border-brand"
          >
            Platform analytics →
          </Link>
          <Link
            href="/platform/health"
            className="block rounded-xl border border-border bg-surface p-4 text-sm font-medium text-ink hover:border-brand"
          >
            System health →
          </Link>
          <Link
            href="/platform/launch-checklist"
            className="block rounded-xl border border-border bg-surface p-4 text-sm font-medium text-ink hover:border-brand"
          >
            Launch checklist →
          </Link>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium text-ink">Security</p>
        <p className="mt-1 text-xs text-muted">
          If you think your account may be compromised, sign out of every
          device at once. You&apos;ll need to sign back in here too.
        </p>
        <Button variant="danger" onClick={logoutEverywhere} loading={busy} className="mt-3 w-full">
          Log out of all devices
        </Button>
      </div>
    </div>
  );
}
