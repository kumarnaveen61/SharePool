import { db } from "@/lib/db";
import { accessSessions, memberships } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";

/**
 * Flips any ACTIVE session whose end time has passed to EXPIRED, and puts
 * its membership back to AVAILABLE (time-based memberships only — a
 * quantity-based benefit's availability isn't tied to a session clock).
 *
 * NOTE: this is a lazy, check-on-read expiry, not a real scheduler. It's
 * good enough to demo correct behavior, but Phase 6 (background jobs)
 * should replace this with an actual cron/queue so sessions expire even
 * if nobody happens to load a page after the end time passes.
 */
export async function expireOverdueSessions(membershipId?: string) {
  const now = new Date();

  const conditions = [eq(accessSessions.status, "ACTIVE"), lt(accessSessions.endTime, now)];
  if (membershipId) {
    conditions.push(eq(accessSessions.membershipId, membershipId));
  }

  const overdue = await db
    .select()
    .from(accessSessions)
    .where(and(...conditions));

  for (const session of overdue) {
    await db.transaction(async (tx) => {
      await tx
        .update(accessSessions)
        .set({ status: "EXPIRED", completedAt: now })
        .where(eq(accessSessions.id, session.id));

      // Only revert to AVAILABLE if this was a time-window membership
      // (quantity-based benefits don't use IN_USE/session-driven status).
      await tx
        .update(memberships)
        .set({ status: "AVAILABLE", updatedAt: now })
        .where(
          and(eq(memberships.id, session.membershipId), eq(memberships.status, "IN_USE"))
        );
    });
  }

  return overdue.length;
}
