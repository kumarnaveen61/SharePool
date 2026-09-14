import { db } from "@/lib/db";
import { users, accessSessions, notifications, reports } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { count, desc, eq } from "drizzle-orm";

const startedAt = Date.now();

export const GET = withErrorHandling(async () => {
  const session = await requireUser();
  requireSuperAdmin(session);

  const dbStart = Date.now();
  const [userCount] = await db.select({ value: count() }).from(users);
  const dbLatencyMs = Date.now() - dbStart;

  const [lastSession] = await db
    .select({ approvedAt: accessSessions.approvedAt })
    .from(accessSessions)
    .orderBy(desc(accessSessions.approvedAt))
    .limit(1);

  const [unreadNotifications] = await db
    .select({ value: count() })
    .from(notifications)
    .where(eq(notifications.isRead, false));

  const [openReports] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.status, "OPEN"));

  return ok({
    status: "healthy",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV,
    database: { connected: true, latencyMs: dbLatencyMs, userCount: userCount.value },
    lastActivityAt: lastSession?.approvedAt.toISOString() ?? null,
    unreadNotifications: unreadNotifications.value,
    openReports: openReports.value,
    timestamp: new Date().toISOString(),
  });
});
