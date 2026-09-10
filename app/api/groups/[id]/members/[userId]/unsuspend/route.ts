import { db } from "@/lib/db";
import { groupMembers } from "@/lib/db/schema";
import { requireUser, requireGroupMembership, requireGroupAdmin } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/admin-log";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) => {
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

    await db
      .update(groupMembers)
      .set({ suspended: false })
      .where(eq(groupMembers.id, targetMembership.id));

    await logAdminAction({
      groupId,
      adminId: session.userId,
      action: "UNSUSPEND_MEMBER",
      targetUserId,
    });

    return ok({ suspended: false });
  }
);
