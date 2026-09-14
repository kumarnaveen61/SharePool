import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { requireUser, requireGroupMembership, requireGroupAdmin } from "@/lib/auth/guards";
import { resolveReportSchema } from "@/lib/validation/report-schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/admin-log";

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: reportId } = await ctx.params;

    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return fail("REPORT_NOT_FOUND", "Report not found.", 404);
    }

    const callerMembership = await requireGroupMembership(session.userId, report.groupId);
    requireGroupAdmin(callerMembership);

    const body = await req.json();
    const data = resolveReportSchema.parse(body);

    const [updated] = await db
      .update(reports)
      .set({
        status: data.status,
        adminNotes: data.adminNotes,
        resolvedBy: session.userId,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    await logAdminAction({
      groupId: report.groupId,
      adminId: session.userId,
      action: "RESOLVE_REPORT",
      targetReportId: reportId,
      targetUserId: report.targetUserId ?? undefined,
      targetMembershipId: report.targetMembershipId ?? undefined,
      reason: data.adminNotes,
    });

    return ok({ report: updated });
  }
);
