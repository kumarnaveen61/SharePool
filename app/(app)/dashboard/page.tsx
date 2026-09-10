import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groups, groupMembers, memberships, accessRequests, poolCredits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session!.userId;

  const myGroups = await db
    .select({ group: groups, role: groupMembers.role })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  const availableByGroup: Record<string, number> = {};
  const creditsByGroup: Record<string, number> = {};
  let pendingIncoming = 0;

  for (const { group } of myGroups) {
    const availableRows = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(eq(memberships.groupId, group.id), eq(memberships.status, "AVAILABLE"))
      );
    availableByGroup[group.id] = availableRows.length;

    const [credit] = await db
      .select()
      .from(poolCredits)
      .where(and(eq(poolCredits.groupId, group.id), eq(poolCredits.userId, userId)))
      .limit(1);
    creditsByGroup[group.id] = credit?.balance ?? 0;
  }

  const pendingRows = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(and(eq(accessRequests.ownerId, userId), eq(accessRequests.status, "PENDING")));
  pendingIncoming = pendingRows.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your groups</h1>
        {pendingIncoming > 0 && (
          <Link
            href="/requests"
            className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-dark"
          >
            {pendingIncoming} request{pendingIncoming !== 1 ? "s" : ""} waiting
          </Link>
        )}
      </div>

      {myGroups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            You&apos;re not in a group yet. Create one for your household, or
            join one with an invite code.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/groups/new"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Create a group
            </Link>
            <Link
              href="/groups/join"
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-background"
            >
              Join with a code
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {myGroups.map(({ group, role }) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 hover:border-brand"
            >
              <div>
                <p className="font-medium text-ink">{group.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {role === "OWNER" ? "You own this group" : "Member"}
                  {" · "}
                  {creditsByGroup[group.id]} Pool Credits
                </p>
              </div>
              {availableByGroup[group.id] > 0 && (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                  {availableByGroup[group.id]} available now
                </span>
              )}
            </Link>
          ))}
          <Link
            href="/groups/new"
            className="rounded-2xl border border-dashed border-border p-5 text-center text-sm font-medium text-muted hover:border-brand hover:text-brand"
          >
            + New group
          </Link>
        </div>
      )}
    </div>
  );
}
