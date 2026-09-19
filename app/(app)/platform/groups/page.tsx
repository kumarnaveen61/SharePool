import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import { GroupAdminActions } from "@/components/GroupAdminActions";

export default async function PlatformGroupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      memberLimit: groups.memberLimit,
      description: groups.description,
      rules: groups.rules,
    })
    .from(groups);

  const memberCounts = await db
    .select({ groupId: groupMembers.groupId, count: count() })
    .from(groupMembers)
    .groupBy(groupMembers.groupId);

  const countMap = new Map(
    memberCounts.map((m) => [m.groupId, Number(m.count)])
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Admin · Groups
          </h1>
          <p className="mt-2 text-sm text-muted">
            All groups on SharePool. Share the invite code with new members.
          </p>
        </div>
        <Link
          href="/platform/providers"
          className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-ink hover:bg-white/5"
        >
          Review providers
        </Link>

        <Link
          href="/groups/new"
          className="rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
        >
          + Create group
        </Link>
      </div>

      {allGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            No groups yet. Create the first one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {allGroups.map((g) => {
            const members = countMap.get(g.id) ?? 0;
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/groups/${g.id}`}
                      className="text-lg font-extrabold hover:text-gold"
                    >
                      {g.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted">
                      {members} member{members === 1 ? "" : "s"} · limit{" "}
                      {g.memberLimit}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-muted">Invite code:</span>
                      <code className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-gold">
                        {g.inviteCode}
                      </code>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/groups/${g.id}`}
                      className="rounded-xl border border-border px-3 py-2 text-[11px] font-extrabold text-ink hover:bg-white/5"
                    >
                      View
                    </Link>
                    <Link
                      href={`/groups/${g.id}/admin`}
                      className="rounded-xl border border-border px-3 py-2 text-[11px] font-extrabold text-ink hover:bg-white/5"
                    >
                      Manage
                    </Link>
                    <GroupAdminActions group={g} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}