import { db } from "@/lib/db";
import { accessSessions, memberships, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { eq } from "drizzle-orm";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const caller = await requireUser();
    const { id: sessionId } = await ctx.params;

    const [accessSession] = await db
      .select()
      .from(accessSessions)
      .where(eq(accessSessions.id, sessionId))
      .limit(1);

    if (!accessSession) {
      return fail("SESSION_NOT_FOUND", "Session not found.", 404);
    }

    // Only the membership owner (or a group admin) may revoke.
    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, accessSession.membershipId))
      .limit(1);

    if (!membership) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    if (membership.ownerId !== caller.userId) {
      return fail(
        "NOT_OWNER",
        "Only the membership owner can revoke access.",
        403
      );
    }

    if (accessSession.status !== "ACTIVE") {
      return fail(
        "NOT_ACTIVE",
        "This access is no longer active.",
        409
      );
    }

    const [requester] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, accessSession.requesterId))
      .limit(1);

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(accessSessions)
        .set({ status: "CANCELLED", completedAt: now })
        .where(eq(accessSessions.id, sessionId));

      // If the membership was IN_USE, put it back to AVAILABLE
      // (only for time-based memberships — quantity-based don't use IN_USE)
      if (membership.remainingUnits === null) {
        await tx
          .update(memberships)
          .set({ status: "AVAILABLE", updatedAt: now })
          .where(eq(memberships.id, membership.id));
      }
    });

    await notify({
      userId: accessSession.requesterId,
      type: "ACCESS_REVOKED",
      title: `Access to ${membership.name} was revoked`,
      body: `${requester?.name ? "" : ""}The owner has ended your access to ${membership.name}.`,
      relatedMembershipId: membership.id,
    });

    await logActivity({
      groupId: membership.groupId,
      actorId: caller.userId,
      action: "ACCESS_REVOKED",
      entityType: "membership",
      entityId: membership.id,
      metadata: {
        membershipName: membership.name,
        requesterName: requester?.name,
      },
    });

    return ok({ revoked: true });
  }
);