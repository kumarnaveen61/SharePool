import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireGroupMembership, AuthError } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { groups, groupMembers, memberships, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { CopyButton } from "@/components/CopyButton";

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  if (role === "OWNER") {
    return (
      <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold">
        Owner
      </span>
    );
  }
  if (role === "ADMIN") {
    return (
      <span className="rounded-full bg-teal-bg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted">
      Member
    </span>
  );
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  let callerMembership;
  try {
    callerMembership = await requireGroupMembership(session.userId, groupId);
  } catch (err) {
    if (err instanceof AuthError) return notFound();
    throw err;
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return notFound();

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const groupMemberships = await db
    .select({
      id: memberships.id,
      name: memberships.name,
      category: memberships.category,
      provider: memberships.provider,
      planName: memberships.planName,
      status: memberships.status,
      ownerId: memberships.ownerId,
      ownerName: users.name,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.ownerId, users.id))
    .where(eq(memberships.groupId, groupId))
    .orderBy(desc(memberships.createdAt))
    .limit(6);

  const isAdmin =
    callerMembership.role === "OWNER" || callerMembership.role === "ADMIN";

  // Sort members: owners first, then admins, then members
  const roleOrder: Record<string, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
  };
  const sortedMembers = [...members].sort(
    (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Group hero card ─────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-lg font-extrabold text-gold">
              {initialsFor(group.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {group.name}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {members.length}{" "}
                {members.length === 1 ? "member" : "members"}
                <span className="mx-1.5">·</span>
                You&apos;re {callerMembership.role.toLowerCase()}
              </p>
              {group.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Link
            href={`/memberships/new?groupId=${group.id}`}
            className="flex-1 rounded-xl bg-gold px-4 py-3 text-center text-xs font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark"
          >
            + Share a subscription
          </Link>
          {isAdmin && (
            <Link
              href={`/groups/${group.id}/admin`}
              className="rounded-xl border border-border px-4 py-3 text-xs font-extrabold text-ink transition-colors hover:bg-white/5"
            >
              Admin
            </Link>
          )}
        </div>
      </div>

      {/* ── Invite code (admin only) ────────────────────────── */}
      {isAdmin && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted">
                Invite code
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Share only with people you trust
              </p>
            </div>
            <CopyButton value={group.inviteCode} label="Copy code" />
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-white/[0.02] px-5 py-4">
            <p className="text-center font-mono text-2xl font-bold tracking-[0.3em] text-gold">
              {group.inviteCode}
            </p>
          </div>
        </div>
      )}

      {/* ── Members ─────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Members</h2>
          <span className="text-[11px] font-semibold text-muted">
            {members.length} of {group.memberLimit}
          </span>
        </div>

        <div className="mt-4 -mx-2 space-y-1">
          {sortedMembers.map((m) => {
            const isMe = m.id === session.userId;
            return (
              <Link
                key={m.id}
                href={`/groups/${group.id}/members/${m.id}`}
                className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-[11px] font-extrabold text-ink">
                  {initialsFor(m.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {m.name}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] font-semibold text-muted">
                        (you)
                      </span>
                    )}
                  </div>
                </div>
                <RoleBadge role={m.role} />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Subscriptions preview ───────────────────────────── */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold">Subscriptions</h2>
            <p className="mt-1 text-[11px] text-muted">
              {groupMemberships.length}{" "}
              {groupMemberships.length === 1 ? "listing" : "listings"} in this
              group
            </p>
          </div>
          <Link
            href={`/memberships?groupId=${group.id}`}
            className="text-xs font-bold text-gold hover:underline"
          >
            See all →
          </Link>
        </div>

        {groupMemberships.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-xs text-muted">
              Nothing shared yet.{" "}
              <Link
                href={`/memberships/new?groupId=${group.id}`}
                className="font-bold text-gold hover:underline"
              >
                Add the first one
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {groupMemberships.map((m) => {
              const isAvailable = m.status === "AVAILABLE";
              return (
                <Link
                  key={m.id}
                  href={`/memberships/${m.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3 transition-colors hover:border-gold/40"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-white/5 text-xs font-extrabold text-gold">
                    {initialsFor(m.provider ?? m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{m.name}</div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      {m.ownerName} ·{" "}
                      {m.category.replace(/_/g, " ").toLowerCase()}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                      isAvailable
                        ? "bg-teal-bg text-teal"
                        : m.status === "IN_USE"
                          ? "bg-amber-bg text-gold"
                          : "bg-red-bg text-red"
                    }`}
                  >
                    {isAvailable ? "Open" : m.status.replace(/_/g, " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Group rules (if any) ────────────────────────────── */}
      {group.rules && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-sm font-extrabold">Group rules</h2>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">
            {group.rules}
          </p>
        </div>
      )}
    </div>
  );
}