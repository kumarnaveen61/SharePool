import { db } from "@/lib/db";
import {
  memberships,
  users,
  membershipAvailability,
  accessRequests,
  accessSessions,
} from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, desc, eq } from "drizzle-orm";
import { expireOverdueSessions } from "@/lib/session-expiry";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await ctx.params;

    const [row] = await db
      .select({ membership: memberships, ownerName: users.name })
      .from(memberships)
      .innerJoin(users, eq(memberships.ownerId, users.id))
      .where(eq(memberships.id, id))
      .limit(1);

    if (!row) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    const callerMembership = await requireGroupMembership(
      session.userId,
      row.membership.groupId
    );
    await expireOverdueSessions(id);

    const [freshMembership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, id))
      .limit(1);

    const upcomingAvailability = await db
      .select()
      .from(membershipAvailability)
      .where(eq(membershipAvailability.membershipId, id))
      .orderBy(desc(membershipAvailability.startTime))
      .limit(5);

    const isOwner = row.membership.ownerId === session.userId;
    const isCallerAdmin =
      callerMembership.role === "OWNER" || callerMembership.role === "ADMIN";

    const pendingRequests = isOwner
      ? await db
          .select()
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.membershipId, id),
              eq(accessRequests.status, "PENDING")
            )
          )
      : [];

    const myPendingRequest = !isOwner
      ? (
          await db
            .select()
            .from(accessRequests)
            .where(
              and(
                eq(accessRequests.membershipId, id),
                eq(accessRequests.requesterId, session.userId),
                eq(accessRequests.status, "PENDING")
              )
            )
            .limit(1)
        )[0] ?? null
      : null;

    // Active members — people who have current access to this membership
    const activeMembersRaw = await db
      .select({
        sessionId: accessSessions.id,
        userId: accessSessions.requesterId,
        userName: users.name,
        startTime: accessSessions.startTime,
        endTime: accessSessions.endTime,
        units: accessSessions.units,
        approvedAt: accessSessions.approvedAt,
      })
      .from(accessSessions)
      .innerJoin(users, eq(accessSessions.requesterId, users.id))
      .where(
        and(
          eq(accessSessions.membershipId, id),
          eq(accessSessions.status, "ACTIVE")
        )
      )
      .orderBy(desc(accessSessions.approvedAt));

    return ok({
      membership: freshMembership ?? row.membership,
      ownerName: row.ownerName,
      isOwner,
      isCallerAdmin,
      upcomingAvailability,
      pendingRequests,
      myPendingRequest,
      activeMembers: activeMembersRaw,
    });
  }
);