import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { createReportSchema } from "@/lib/validation/report-schemas";
import { ok, withErrorHandling } from "@/lib/api-response";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = createReportSchema.parse(body);

  await requireGroupMembership(session.userId, data.groupId);

  const [report] = await db
    .insert(reports)
    .values({
      groupId: data.groupId,
      reportedBy: session.userId,
      targetType: data.targetType,
      targetUserId: data.targetUserId,
      targetMembershipId: data.targetMembershipId,
      reason: data.reason,
    })
    .returning();

  return ok({ report }, 201);
});
