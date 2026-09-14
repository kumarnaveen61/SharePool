import { db } from "@/lib/db";
import { reports, users, memberships } from "@/lib/db/schema";
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

    const reporterUsers = alias(users, "reporter_users");
    const targetUsersAlias = alias(users, "target_users");

    const rows = await db
      .select({
        report: reports,
        reporterName: reporterUsers.name,
        targetUserName: targetUsersAlias.name,
        targetMembershipName: memberships.name,
      })
      .from(reports)
      .innerJoin(reporterUsers, eq(reports.reportedBy, reporterUsers.id))
      .leftJoin(targetUsersAlias, eq(reports.targetUserId, targetUsersAlias.id))
      .leftJoin(memberships, eq(reports.targetMembershipId, memberships.id))
      .where(eq(reports.groupId, groupId))
      .orderBy(desc(reports.createdAt));

    return ok({
      reports: rows.map((r) => ({
        ...r.report,
        reporterName: r.reporterName,
        targetUserName: r.targetUserName,
        targetMembershipName: r.targetMembershipName,
      })),
    });
  }
);
