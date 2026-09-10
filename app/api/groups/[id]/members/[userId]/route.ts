import { db } from "@/lib/db";
import {
  users,
  groupMembers,
  memberships,
  accessSessions,
  accessRequests,
  poolCredits,
} from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, count, eq } from "drizzle-orm";
import { getTrustScore } from "@/lib/trust";
import { blockedUsers } from "@/lib/db/schema";

export const GET = withErrorHandling(
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string; userId: string }> }
  ) => {
    const session = await requireUser();
    const { id: groupId, userId: targetUserId } = await ctx.params;

    // Caller must be in the group; the profile itself is only meaningful
    // in the context of a shared group anyway (credits are per-group).
    const callerMembership = await requireGroupMembership(session.userId, groupId);
    const targetMembership = await requireGroupMembership(targetUserId, groupId);

    const [user] = await db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!user) {
      return fail("USER_NOT_FOUND", "Member not found.", 404);
    }

    const [membershipsContributed] = await db
      .select({ value: count() })
      .from(memberships)
      .where(
        and(eq(memberships.groupId, groupId), eq(memberships.ownerId, targetUserId))
      );

    const sharedSessions = await db
      .select({ id: accessSessions.id })
      .from(accessSessions)
      .innerJoin(memberships, eq(accessSessions.membershipId, memberships.id))
      .where(and(eq(memberships.groupId, groupId), eq(accessSessions.ownerId, targetUserId)));

    const usedSessions = await db
      .select({ id: accessSessions.id })
      .from(accessSessions)
      .innerJoin(memberships, eq(accessSessions.membershipId, memberships.id))
      .where(
        and(eq(memberships.groupId, groupId), eq(accessSessions.requesterId, targetUserId))
      );

    const successfulRequests = await db
      .select({ id: accessRequests.id })
      .from(accessRequests)
      .innerJoin(memberships, eq(accessRequests.membershipId, memberships.id))
      .where(
        and(
          eq(memberships.groupId, groupId),
          eq(accessRequests.requesterId, targetUserId),
          eq(accessRequests.status, "APPROVED")
        )
      );

    const cancelledRequests = await db
      .select({ id: accessRequests.id })
      .from(accessRequests)
      .innerJoin(memberships, eq(accessRequests.membershipId, memberships.id))
      .where(
        and(
          eq(memberships.groupId, groupId),
          eq(accessRequests.requesterId, targetUserId),
          eq(accessRequests.status, "CANCELLED")
        )
      );

    const [credit] = await db
      .select()
      .from(poolCredits)
      .where(and(eq(poolCredits.groupId, groupId), eq(poolCredits.userId, targetUserId)))
      .limit(1);

    const trust = await getTrustScore(targetUserId);

    const isCallerAdmin = callerMembership.role === "OWNER" || callerMembership.role === "ADMIN";

    const [existingBlock] = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.groupId, groupId),
          eq(blockedUsers.blockerId, session.userId),
          eq(blockedUsers.blockedId, targetUserId)
        )
      )
      .limit(1);

    return ok({
      user,
      isSelf: targetUserId === session.userId,
      poolCredits: credit?.balance ?? 0,
      membershipsContributed: membershipsContributed.value,
      benefitsShared: sharedSessions.length,
      benefitsUsed: usedSessions.length,
      successfulRequests: successfulRequests.length,
      cancelledRequests: cancelledRequests.length,
      trustScore: trust.average,
      ratingCount: trust.count,
      isCallerAdmin,
      targetRole: targetMembership.role,
      targetSuspended: targetMembership.suspended,
      isBlockedByMe: !!existingBlock,
    });
  }
);
