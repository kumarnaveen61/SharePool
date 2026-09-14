"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Notification = { id: string; isRead: boolean };

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function load() {
      apiFetch<{ notifications: Notification[] }>("/api/notifications")
        .then(({ notifications }) => {
          if (!cancelled) {
            setUnread(notifications.filter((n) => !n.isRead).length);
          }
        })
        .catch(() => {});
    }

    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative flex items-center rounded-full px-3 py-2.5 text-muted transition-colors hover:text-ink [&>svg]:h-[18px] [&>svg]:w-[18px]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-gold px-1 text-[9px] font-extrabold text-[#1A1300]">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}