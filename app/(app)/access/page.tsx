import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  accessSessions,
  memberships,
  users,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { AccessTabs } from "@/components/access/AccessTabs";

export default async function AccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.userId;

  // Owned memberships
  const ownedRaw = await db
     .select({
      id: memberships.id,
      name: memberships.name,
      category: memberships.category,
      provider: memberships.provider,
      status: memberships.status,
      maxUsers: memberships.maxSimultaneousUsers,
    })
    .from(memberships)
    .where(eq(memberships.ownerId, userId))
    .orderBy(desc(memberships.createdAt));

  // Active session counts for the owned memberships
  const ownedIds = ownedRaw.map((m) => m.id);
  const activeRaw = ownedIds.length
    ? await db
        .select({ membershipId: accessSessions.membershipId })
        .from(accessSessions)
        .where(eq(accessSessions.status, "ACTIVE"))
    : [];
  const activeMap = new Map<string, number>();
  for (const r of activeRaw) {
    if (!ownedIds.includes(r.membershipId)) continue;
    activeMap.set(r.membershipId, (activeMap.get(r.membershipId) ?? 0) + 1);
  }

  // Using — active access from others
  const usingRaw = await db
    .select({
      sessionId: accessSessions.id,
      membershipId: memberships.id,
      membershipName: memberships.name,
      provider: memberships.provider,
      ownerName: users.name,
      endTime: accessSessions.endTime,
      units: accessSessions.units,
    })
    .from(accessSessions)
    .innerJoin(memberships, eq(accessSessions.membershipId, memberships.id))
    .innerJoin(users, eq(accessSessions.ownerId, users.id))
    .where(
      and(
        eq(accessSessions.requesterId, userId),
        eq(accessSessions.status, "ACTIVE")
      )
    )
    .orderBy(desc(accessSessions.approvedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Access</h1>
        <p className="mt-2 text-sm text-muted">
          Subscriptions you own and subscriptions you use from others.
        </p>
      </div>

      <AccessTabs
        owned={ownedRaw.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          provider: m.provider,
          status: m.status,
          maxUsers: m.maxUsers,
          activeCount: activeMap.get(m.id) ?? 0,
        }))}
        using={usingRaw.map((s) => ({
          sessionId: s.sessionId,
          membershipId: s.membershipId,
          membershipName: s.membershipName,
          provider: s.provider,
          ownerName: s.ownerName,
          endTime: s.endTime ? s.endTime.toISOString() : null,
          units: s.units,
        }))}
      />
    </div>
  );
}
