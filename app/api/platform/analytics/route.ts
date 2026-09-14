import { db } from "@/lib/db";
import {
  users,
  groups,
  memberships,
  accessRequests,
  accessSessions,
  reports,
  poolCredits,
} from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { count, eq, sql } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  const session = await requireUser();
  requireSuperAdmin(session);

  const [[userCount], [groupCount], [membershipCount], [sessionCount], [openReportCount], [creditSum], categoryBreakdown, requestStatusBreakdown] =
    await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(groups),
      db.select({ value: count() }).from(memberships),
      db.select({ value: count() }).from(accessSessions),
      db.select({ value: count() }).from(reports).where(eq(reports.status, "OPEN")),
      db.select({ value: sql<number>`coalesce(sum(${poolCredits.balance}), 0)` }).from(poolCredits),
      db
        .select({ category: memberships.category, value: count() })
        .from(memberships)
        .groupBy(memberships.category),
      db
        .select({ status: accessRequests.status, value: count() })
        .from(accessRequests)
        .groupBy(accessRequests.status),
    ]);

  return ok({
    totals: {
      users: userCount.value,
      groups: groupCount.value,
      memberships: membershipCount.value,
      accessSessions: sessionCount.value,
      openReports: openReportCount.value,
      creditsInCirculation: Number(creditSum.value),
    },
    membershipsByCategory: categoryBreakdown,
    requestsByStatus: requestStatusBreakdown,
  });
});
