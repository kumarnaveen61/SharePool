import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  accessRequests,
  memberships,
  users,
  activityLogs,
  groupMembers,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { ActivityTabs } from "@/components/activity/ActivityTabs";

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.userId;

  // My groups
  const myGroupRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const groupIds = myGroupRows.map((g) => g.groupId);

  // Incoming — requests to memberships I own
  const incomingRaw = groupIds.length === 0
    ? []
    : await db
        .select({
          id: accessRequests.id,
          status: accessRequests.status,
          membershipId: accessRequests.membershipId,
          membershipName: memberships.name,
          requesterName: users.name,
          reason: accessRequests.reason,
          requestedStartTime: accessRequests.requestedStartTime,
          requestedEndTime: accessRequests.requestedEndTime,
          createdAt: accessRequests.createdAt,
        })
        .from(accessRequests)
        .innerJoin(memberships, eq(accessRequests.membershipId, memberships.id))
        .innerJoin(users, eq(accessRequests.requesterId, users.id))
        .where(
          and(
            eq(accessRequests.ownerId, userId),
            eq(accessRequests.status, "PENDING")
          )
        )
        .orderBy(desc(accessRequests.createdAt));

  // Outgoing — my requests
  const outgoingRaw = await db
    .select({
      id: accessRequests.id,
      status: accessRequests.status,
      membershipId: accessRequests.membershipId,
      membershipName: memberships.name,
      ownerName: users.name,
      createdAt: accessRequests.createdAt,
    })
    .from(accessRequests)
    .innerJoin(memberships, eq(accessRequests.membershipId, memberships.id))
    .innerJoin(users, eq(accessRequests.ownerId, users.id))
    .where(eq(accessRequests.requesterId, userId))
    .orderBy(desc(accessRequests.createdAt));

  // History — recent activity in my groups
  const historyRaw = groupIds.length === 0
    ? []
    : await db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt,
          actorName: users.name,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.actorId, users.id))
        .where(inArray(activityLogs.groupId, groupIds))
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Activity</h1>
        <p className="mt-2 text-sm text-muted">
          Requests and history from your SharePool network.
        </p>
      </div>

      <ActivityTabs
        currentUserId={userId}
        incoming={incomingRaw.map((r) => ({
          id: r.id,
          status: r.status,
          membershipId: r.membershipId,
          membershipName: r.membershipName,
          requesterName: r.requesterName,
          reason: r.reason,
          requestedStartTime: r.requestedStartTime
            ? r.requestedStartTime.toISOString()
            : null,
          requestedEndTime: r.requestedEndTime
            ? r.requestedEndTime.toISOString()
            : null,
          createdAt: r.createdAt.toISOString(),
        }))}
        outgoing={outgoingRaw.map((r) => ({
          id: r.id,
          status: r.status,
          membershipId: r.membershipId,
          membershipName: r.membershipName,
          ownerName: r.ownerName,
          createdAt: r.createdAt.toISOString(),
        }))}
        history={historyRaw.map((h) => ({
          id: h.id,
          action: h.action,
          entityType: h.entityType,
          entityId: h.entityId,
          metadata: h.metadata,
          createdAt: h.createdAt.toISOString(),
          actorName: h.actorName,
        }))}
      />
    </div>
  );
}
