"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

// Matches the spec's suggested primary navigation: Home, Explore,
// Requests, My Pool, Profile.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/memberships", label: "Explore" },
  { href: "/requests", label: "Requests" },
  { href: "/groups", label: "My Pool" },
  { href: "/profile", label: "Profile" },
];

function VerificationBanner() {
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiFetch<{ user: { emailVerified: boolean } }>("/api/auth/me")
      .then(({ user }) => setEmailVerified(user.emailVerified))
      .catch(() => setEmailVerified(null));
  }, []);

  async function resend() {
    setSending(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (emailVerified !== false) return null;

  return (
    <div className="border-b border-accent/30 bg-accent/10 px-6 py-2 text-center text-xs text-accent-dark">
      {sent ? (
        "Verification link sent — check the server log (no email provider is connected in this demo)."
      ) : (
        <>
          Please verify your email.{" "}
          <button onClick={resend} disabled={sending} className="font-medium underline">
            Resend link
          </button>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <VerificationBanner />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-brand" aria-hidden />
            <span className="font-semibold text-ink">SharePool</span>
          </Link>
          <nav className="hidden gap-6 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium ${
                  pathname.startsWith(item.href)
                    ? "text-brand"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3 text-center text-xs font-medium ${
              pathname.startsWith(item.href) ? "text-brand" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
