import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-log";
import { z } from "zod";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .limit(1);

    if (!membership) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    const callerMembership = await requireGroupMembership(session.userId, membership.groupId);

    const isOwner = membership.ownerId === session.userId;
    const isAdmin = callerMembership.role === "OWNER" || callerMembership.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return fail(
        "NOT_ALLOWED",
        "Only the membership owner or a group admin can remove this.",
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const { reason } = bodySchema.parse(body);

    // Soft-delete: keep the row (access history/ratings reference it) but
    // take it out of circulation. A hard delete would orphan past
    // access_sessions and ratings tied to it.
    await db
      .update(memberships)
      .set({ status: "UNAVAILABLE", updatedAt: new Date() })
      .where(eq(memberships.id, membershipId));

    if (!isOwner) {
      // An admin removed someone else's membership — log it and let them know.
      await logAdminAction({
        groupId: membership.groupId,
        adminId: session.userId,
        action: "REMOVE_MEMBERSHIP",
        targetUserId: membership.ownerId,
        targetMembershipId: membership.id,
        reason,
      });

      await notify({
        userId: membership.ownerId,
        type: "MEMBERSHIP_REMOVED_BY_ADMIN",
        title: `Your membership "${membership.name}" was removed by a group admin`,
        body: reason,
        relatedMembershipId: membership.id,
      });
    }

    return ok({ removed: true });
  }
);
