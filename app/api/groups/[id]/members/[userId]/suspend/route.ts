import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";
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

    // Admins can't suspend the group owner, and can't suspend themselves
    // via this route — prevents a group being left with no one able to
    // reverse the suspension.
    if (targetMembership.role === "OWNER") {
      return fail("CANNOT_SUSPEND_OWNER", "The group owner can't be suspended.", 400);
    }

    const body = await req.json().catch(() => ({}));
    const { reason } = bodySchema.parse(body);

    await db
      .update(groupMembers)
      .set({ suspended: true })
      .where(eq(groupMembers.id, targetMembership.id));

    await logAdminAction({
      groupId,
      adminId: session.userId,
      action: "SUSPEND_MEMBER",
      targetUserId,
      reason,
    });

    await notify({
      userId: targetUserId,
      type: "SUSPENDED_BY_ADMIN",
      title: "Your access to this group was suspended",
      body: reason,
    });

    return ok({ suspended: true });
  }
);
