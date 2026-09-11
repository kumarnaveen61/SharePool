import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  users,
  groups,
  groupMembers,
  poolCredits,
  notifications,
} from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const QUICK_ACTIONS = [
  { href: "/memberships", label: "Explore", emoji: "🔍", bg: "bg-brand" },
  { href: "/requests", label: "Requests", emoji: "📥", bg: "bg-accent" },
  { href: "/groups", label: "My Pool", emoji: "🏠", bg: "bg-[#8b5cf6]" },
  { href: "/memberships/new", label: "Add Membership", emoji: "➕", bg: "bg-[#2f7d4f]" },
  { href: "/groups/join", label: "Join Group", emoji: "🔗", bg: "bg-[#e11d48]" },
  { href: "/profile", label: "Profile", emoji: "👤", bg: "bg-[#0ea5e9]" },
];

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.userId;

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [{ totalCredits }] = await db
    .select({ totalCredits: sql<number>`coalesce(sum(${poolCredits.balance}), 0)` })
    .from(poolCredits)
    .where(eq(poolCredits.userId, userId));

  const myGroups = await db
    .select({ id: groups.id })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  // "Add Membership" needs a group to attach to — send people without one
  // to My Pool first rather than a broken form.
  const addMembershipHref =
    myGroups.length > 0 ? `/memberships/new?groupId=${myGroups[0].id}` : "/groups";

  const actions = QUICK_ACTIONS.map((a) =>
    a.label === "Add Membership" ? { ...a, href: addMembershipHref } : a
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">
        Welcome back, {user?.name?.split(" ")[0] ?? "there"}!
      </h1>
      <p className="mt-1 text-sm text-muted">
        Manage your groups and shared memberships.
      </p>

      {/* Balance card */}
      <div className="mt-5 rounded-2xl bg-[#12212b] p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/60">Pool Credits</p>
          <span className="text-lg">🪙</span>
        </div>
        <p className="mt-2 text-3xl font-semibold">{Number(totalCredits)}</p>
        <p className="mt-1 text-xs text-white/50">
          Earned by contributing and sharing across your groups
        </p>
      </div>

      {/* Quick actions grid */}
      <h2 className="mt-6 text-sm font-medium text-muted">Quick actions</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center hover:border-brand"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${a.bg}`}
            >
              {a.emoji}
            </span>
            <span className="text-xs font-medium text-ink">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Recent activity</h2>
        <Link href="/requests" className="text-xs font-medium text-brand">
          View all
        </Link>
      </div>

      {recentNotifications.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No activity yet.</p>
          <p className="mt-1 text-xs text-muted">
            Start sharing to see updates here.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {recentNotifications.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-border bg-surface p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-ink">{n.title}</p>
                <span className="shrink-0 text-xs text-muted">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}