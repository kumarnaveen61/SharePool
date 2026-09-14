import { db } from "@/lib/db";
import { blockedUsers } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) => {
    const session = await requireUser();
    const { id: groupId, userId: targetUserId } = await ctx.params;
    await requireGroupMembership(session.userId, groupId);

    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.groupId, groupId),
          eq(blockedUsers.blockerId, session.userId),
          eq(blockedUsers.blockedId, targetUserId)
        )
      );

    return ok({ unblocked: true });
  }
);
