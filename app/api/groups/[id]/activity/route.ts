import { db } from "@/lib/db";
import { adminActions, users } from "@/lib/db/schema";
import { requireUser, requireGroupMembership, requireGroupAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: groupId } = await ctx.params;

    const callerMembership = await requireGroupMembership(session.userId, groupId);
    requireGroupAdmin(callerMembership);

    const adminUsers = alias(users, "admin_users");
    const targetUsers = alias(users, "target_users");

    const rows = await db
      .select({
        action: adminActions,
        adminName: adminUsers.name,
        targetUserName: targetUsers.name,
      })
      .from(adminActions)
      .innerJoin(adminUsers, eq(adminActions.adminId, adminUsers.id))
      .leftJoin(targetUsers, eq(adminActions.targetUserId, targetUsers.id))
      .where(eq(adminActions.groupId, groupId))
      .orderBy(desc(adminActions.createdAt))
      .limit(100);

    return ok({
      actions: rows.map((r) => ({
        ...r.action,
        adminName: r.adminName,
        targetUserName: r.targetUserName,
      })),
    });
  }
);
