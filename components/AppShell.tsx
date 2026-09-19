"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { BrandLogo } from "./BrandLogo";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { BottomNav } from "./BottomNav";
import { QuickActionsFAB } from "./QuickActionsFAB";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/requests",
    label: "My requests",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/my-access",
    label: "My access",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
  {
    href: "/memberships",
    label: "My listings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    href: "/memberships/new",
    label: "List a subscription",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
];

function AdminTab() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: { role?: string } }>("/api/auth/me")
      .then(({ user }) => setRole(user.role ?? null))
      .catch(() => setRole(null));
  }, []);

  if (role !== "SUPER_ADMIN") return null;

  return (
    <Link
      href="/platform/groups"
      className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink md:px-4 md:text-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6z" />
      </svg>
      <span className="hidden sm:inline">Admin</span>
    </Link>
  );
}

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
    <div className="border-b border-gold/30 bg-amber-bg px-4 py-2 text-center text-[11px] text-gold sm:text-xs">
      {sent ? (
        "Verification link sent — check your inbox."
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
    <div className="min-h-screen bg-background text-ink">
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:px-10 md:py-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
                <BrandLogo size={32} />
                <span className="text-lg font-extrabold tracking-tight">
                  SharePool
                </span>
              </Link>

              <div className="hidden items-center gap-0.5 rounded-full border border-[var(--pill-border)] bg-[var(--pill-bg)] p-1.5 md:flex">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px] md:px-4 md:text-sm ${
                        isActive
                          ? "bg-[var(--pill-active-bg)] text-[var(--pill-active-fg)]"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <AdminTab />
                <NotificationBell />

                <div className="mx-1.5 h-6 w-px shrink-0 bg-[var(--pill-border)]" />

                <Link
                  href="/memberships"
                  aria-label="Search"
                  className="flex shrink-0 items-center rounded-full px-3 py-2.5 text-muted transition-colors hover:text-ink [&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </Link>

                <ThemeToggle />

                <Link
                  href="/profile"
                  aria-label="Settings"
                  className="flex shrink-0 items-center rounded-full px-3 py-2.5 text-muted transition-colors hover:text-ink [&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="flex shrink-0 items-center rounded-full px-3 py-2.5 text-muted transition-colors hover:text-red [&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-0.5 md:hidden">
                <NotificationBell />
                <ThemeToggle />
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="flex shrink-0 items-center rounded-full px-3 py-2.5 text-muted transition-colors hover:text-ink [&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <VerificationBanner />
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-32 sm:px-6 md:px-10 md:pb-16 md:pt-36">
        {children}
      </main>

      <BottomNav />
      <QuickActionsFAB />
    </div>
  );
}