"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  relatedMembershipId: string | null;
  relatedAccessRequestId: string | null;
};

const ICONS: Record<string, { emoji: string }> = {
  REQUEST_RECEIVED: { emoji: "📥" },
  REQUEST_APPROVED: { emoji: "✅" },
  REQUEST_REJECTED: { emoji: "❌" },
  REQUEST_CANCELLED: { emoji: "🚫" },
  SESSION_ENDING_SOON: { emoji: "⏰" },
  SESSION_COMPLETED: { emoji: "🎉" },
  MEMBERSHIP_AVAILABLE: { emoji: "✨" },
  MEMBERSHIP_EXPIRING: { emoji: "⚠️" },
  CREDITS_RECEIVED: { emoji: "🪙" },
  MEMBERSHIP_REMOVED_BY_ADMIN: { emoji: "🗑️" },
  SUSPENDED_BY_ADMIN: { emoji: "⛔" },
  REMOVED_FROM_GROUP: { emoji: "👋" },
  ACCESS_REVOKED: { emoji: "🚫" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function hrefFor(n: NotificationRow): string | null {
  if (n.relatedMembershipId) return `/memberships/${n.relatedMembershipId}`;
  if (n.relatedAccessRequestId) return `/requests`;
  return null;
}

export function NotificationList({ initial }: { initial: NotificationRow[] }) {
  const [items, setItems] = useState(initial);
  const unread = items.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || item.isRead) return;

    // Optimistic update
    setItems((p) => p.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Revert on failure
      setItems((p) => p.map((i) => (i.id === id ? { ...i, isRead: false } : i)));
    }
  }

  async function markAllRead() {
    const ids = items.filter((n) => !n.isRead).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((p) => p.map((i) => ({ ...i, isRead: true })));
    await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(
          () => {}
        )
      )
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="text-5xl">🔔</div>
        <h2 className="mt-5 text-lg font-extrabold tracking-tight">
          You&apos;re all caught up
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          No notifications yet. When someone requests access to your
          subscriptions or approves yours, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-muted">
            {unread} unread
          </div>
          <button
            onClick={markAllRead}
            className="text-xs font-bold text-gold hover:underline"
          >
            Mark all as read
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => {
          const icon = ICONS[n.type]?.emoji ?? "🔔";
          const href = hrefFor(n);
          const card = (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 transition-all hover:border-gold/40 ${
                n.isRead
                  ? "border-border bg-card"
                  : "border-gold/25 bg-card ring-1 ring-gold/10"
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-lg">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold leading-snug">
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="mt-1 text-xs leading-relaxed text-muted">
                        {n.body}
                      </div>
                    )}
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  )}
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            </div>
          );

          return href ? (
            <Link
              key={n.id}
              href={href}
              onClick={() => markRead(n.id)}
              className="block"
            >
              {card}
            </Link>
          ) : (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className="block w-full text-left"
            >
              {card}
            </button>
          );
        })}
      </div>
    </div>
  );
}