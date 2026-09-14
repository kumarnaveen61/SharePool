import { db } from "@/lib/db";
import { groupMembers, memberships } from "@/lib/db/schema";
import { requireUser, requireGroupMembership, requireGroupAdmin } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-log";
import { z } from "zod";

const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) => {
    const session = await requireUser();
    const { id: groupId, userId: targetUserId } = await ctx.params;

    const callerMembership = await requireGroupMembership(session.userId, groupId);
    requireGroupAdmin(callerMembership);

    const [targetMembership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)))
      .limit(1);

    if (!targetMembership) {
      return fail("MEMBER_NOT_FOUND", "This person isn't in the group.", 404);
    }

    if (targetMembership.role === "OWNER") {
      return fail(
        "CANNOT_REMOVE_OWNER",
        "The group owner can't be removed. Transfer ownership first.",
        400
      );
    }

    const body = await req.json().catch(() => ({}));
    const { reason } = bodySchema.parse(body);

    await db.transaction(async (tx) => {
      await tx.delete(groupMembers).where(eq(groupMembers.id, targetMembership.id));

      // Their contributed memberships stay on record (for everyone else's
      // history/audit trail) but can no longer be offered or requested
      // now that they've left.
      await tx
        .update(memberships)
        .set({ status: "UNAVAILABLE", updatedAt: new Date() })
        .where(and(eq(memberships.groupId, groupId), eq(memberships.ownerId, targetUserId)));

      await logAdminAction({
        groupId,
        adminId: session.userId,
        action: "REMOVE_MEMBER",
        targetUserId,
        reason,
      });
    });

    await notify({
      userId: targetUserId,
      type: "REMOVED_FROM_GROUP",
      title: "You were removed from a group",
      body: reason,
    });

    return ok({ removed: true });
  }
);
