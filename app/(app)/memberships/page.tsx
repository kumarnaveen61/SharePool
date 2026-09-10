import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groups, groupMembers, memberships, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { MembershipCard } from "@/components/membership/MembershipCard";

export default async function MembershipsPage() {
  const session = await getSession();
  const userId = session!.userId;

  const myGroups = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  const groupIds = myGroups.map((g) => g.group.id);

  const rows =
    groupIds.length === 0
      ? []
      : await db
          .select({
            membership: memberships,
            ownerName: users.name,
            groupName: groups.name,
          })
          .from(memberships)
          .innerJoin(users, eq(memberships.ownerId, users.id))
          .innerJoin(groups, eq(memberships.groupId, groups.id))
          .where(inArray(memberships.groupId, groupIds));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">All memberships</h1>
      <p className="mt-1 text-sm text-muted">Across every group you belong to.</p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          Nothing added yet.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {rows.map(({ membership: m, ownerName, groupName }) => (
            <div key={m.id}>
              <p className="mb-1 text-xs text-muted">{groupName}</p>
              <MembershipCard
                membership={m}
                ownerName={ownerName}
                isOwnMembership={m.ownerId === userId}
              />
            </div>
          ))}
        </div>
      )}

      <Link
        href="/groups"
        className="mt-6 block text-center text-sm font-medium text-brand"
      >
        View your groups
      </Link>
    </div>
  );
}
