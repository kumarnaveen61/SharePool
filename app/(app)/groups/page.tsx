import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function GroupsPage() {
  const session = await getSession();
  const userId = session!.userId;

  const myGroups = await db
    .select({ group: groups, role: groupMembers.role })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your groups</h1>
        <Link
          href="/groups/new"
          className="rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New
        </Link>
      </div>

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
                {role === "OWNER" ? "Owner" : "Member"}
              </p>
            </div>
          </Link>
        ))}
        <Link
          href="/groups/join"
          className="rounded-2xl border border-dashed border-border p-5 text-center text-sm font-medium text-muted hover:border-brand hover:text-brand"
        >
          Join with an invite code
        </Link>
      </div>
    </div>
  );
}
