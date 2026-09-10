import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { requireGroupMembership, AuthError } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { groups, groupMembers, memberships, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MembershipsBrowser } from "@/components/membership/MembershipsBrowser";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  let membership;
  try {
    membership = await requireGroupMembership(session.userId, groupId);
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
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const groupMemberships = await db
    .select({ membership: memberships, ownerName: users.name })
    .from(memberships)
    .innerJoin(users, eq(memberships.ownerId, users.id))
    .where(eq(memberships.groupId, groupId));

  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{group.name}</h1>
          {group.description && (
            <p className="mt-1 text-sm text-muted">{group.description}</p>
          )}
        </div>
        <Link
          href={`/memberships/new?groupId=${group.id}`}
          className="rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Add
        </Link>
      </div>

      {isAdmin && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Invite code — share only with people you trust</p>
              <p className="mt-1 font-mono text-lg tracking-widest text-ink">
                {group.inviteCode}
              </p>
            </div>
            <Link
              href={`/groups/${group.id}/admin`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:border-brand"
            >
              Admin
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-medium text-muted">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/groups/${group.id}/members/${m.id}`}
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink hover:border-brand"
            >
              {m.name}
              {m.role === "OWNER" && (
                <span className="ml-1 text-muted">· owner</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-muted">Memberships</h2>
        {groupMemberships.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            No memberships added yet.{" "}
            <Link href={`/memberships/new?groupId=${group.id}`} className="font-medium text-brand">
              Add the first one
            </Link>
            .
          </div>
        ) : (
          <div className="mt-3">
            <MembershipsBrowser
              groupId={group.id}
              currentUserId={session.userId}
              initialMemberships={groupMemberships.map(({ membership: m, ownerName }) => ({
                ...m,
                ownerName,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
