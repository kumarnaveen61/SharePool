"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ACTIONS = [
  {
    href: "/memberships/new",
    label: "List a subscription",
    desc: "Share a slot from a plan you pay for",
    icon: "➕",
  },
  {
    href: "/memberships",
    label: "Request access",
    desc: "Browse what your group is sharing",
    icon: "🔍",
  },
  {
    href: "/groups/join",
    label: "Join a group",
    desc: "Enter an invite code",
    icon: "👥",
  },
];

export function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className={`fixed right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold text-[#1A1300] shadow-2xl transition-all md:hidden ${
          open ? "rotate-45" : ""
        }`}
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Action sheet */}
      {open && (
        <div
          className="fixed inset-x-0 z-50 md:hidden"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 152px)",
          }}
        >
          <div className="mx-5 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            {ACTIONS.map((action, i) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex items-center gap-3 px-5 py-4 transition-colors active:bg-white/[0.03] ${
                  i !== ACTIONS.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-lg">
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold">{action.label}</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    {action.desc}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0 text-muted"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}