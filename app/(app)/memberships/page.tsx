import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groups, groupMembers, memberships, users } from "@/lib/db/schema";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { RequestAccessButton } from "@/components/membership/RequestAccessButton";

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const userId = session.userId;
  const { category, q } = await searchParams;

  // Which groups does this user belong to?
  const myGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = myGroups.map((g) => g.groupId);

  if (groupIds.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          You&apos;re not in a group yet
        </h1>
        <p className="mt-3 text-sm text-muted">
          Join a group to see what&apos;s being shared.
        </p>
        <Link
          href="/groups/join"
          className="mt-6 inline-block rounded-xl bg-gold px-5 py-3 text-sm font-bold text-[#1A1300] hover:bg-gold-dark"
        >
          Join with invite code
        </Link>
      </div>
    );
  }

  // Build dynamic filters
  const conditions = [inArray(memberships.groupId, groupIds)];
  if (category) {
    conditions.push(eq(memberships.category, category as never));
  }
  if (q) {
    conditions.push(
      or(
        ilike(memberships.provider, `%${q}%`),
        ilike(memberships.name, `%${q}%`)
      ) as never
    );
  }

  const rows = await db
    .select({
      membership: memberships,
      ownerName: users.name,
      ownerId: users.id,
      groupName: groups.name,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.ownerId, users.id))
    .innerJoin(groups, eq(memberships.groupId, groups.id))
    .where(and(...conditions));

  const title =
    q ?? (category ? category.replace(/_/g, " ") : "All memberships");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-muted hover:text-ink"
        >
          &larr; Back to Quick Services
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {rows.length} {rows.length === 1 ? "listing" : "listings"} in your
          group
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted">
            Nobody in your group is sharing{" "}
            <span className="font-bold text-ink">{q ?? "this category"}</span>{" "}
            yet.
          </p>
          <Link
            href="/memberships/new"
            className="mt-5 inline-block rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
          >
            Share your own
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map(({ membership: m, ownerName, ownerId, groupName }) => {
            const isOwn = ownerId === userId;
            const isAvailable = m.status === "AVAILABLE";
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-gold/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-base font-extrabold">{m.name}</div>
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                          isAvailable
                            ? "bg-teal-bg text-teal"
                            : m.status === "IN_USE"
                              ? "bg-amber-bg text-gold"
                              : "bg-red-bg text-red"
                        }`}
                      >
                        {isAvailable ? "Open" : m.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-1.5 text-xs text-muted">
                      Owned by{" "}
                      <span className="font-semibold text-ink">{ownerName}</span>
                      {isOwn && " (you)"}
                      <span className="mx-1.5">·</span>
                      {groupName}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                      <span>{m.category.replace(/_/g, " ")}</span>
                      {m.planName && <span>· {m.planName}</span>}
                      {m.maxSimultaneousUsers > 1 && (
                        <span>· up to {m.maxSimultaneousUsers} users</span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            m.sharingEligibility === "OFFICIALLY_SHAREABLE"
                              ? "bg-teal"
                              : m.sharingEligibility === "NOT_SHAREABLE"
                                ? "bg-red"
                                : "bg-gold"
                          }`}
                        />
                        {m.sharingEligibility.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isOwn ? (
                      <Link
                        href={`/memberships/${m.id}`}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-ink hover:bg-white/5"
                      >
                        Manage
                      </Link>
                    ) : isAvailable ? (
                      <RequestAccessButton membershipId={m.id} />
                    ) : (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted"
                      >
                        No slots
                      </button>
                    )}
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