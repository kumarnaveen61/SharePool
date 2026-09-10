import { db } from "@/lib/db";
import { accessSessions, memberships, users, ratings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { desc, eq } from "drizzle-orm";
import { expireOverdueSessions } from "@/lib/session-expiry";
import { alias } from "drizzle-orm/pg-core";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const { searchParams } = new URL(req.url);
  // "outgoing" = sessions where I was the requester (things I used).
  // "incoming" = sessions where I was the owner (things others used of mine).
  const direction = searchParams.get("direction") ?? "outgoing";

  await expireOverdueSessions();

  const ownerUsers = alias(users, "owner_users");
  const requesterUsers = alias(users, "requester_users");

  const rows = await db
    .select({
      accessSession: accessSessions,
      membershipName: memberships.name,
      ownerName: ownerUsers.name,
      requesterName: requesterUsers.name,
      rating: ratings,
    })
    .from(accessSessions)
    .innerJoin(memberships, eq(accessSessions.membershipId, memberships.id))
    .innerJoin(ownerUsers, eq(accessSessions.ownerId, ownerUsers.id))
    .innerJoin(requesterUsers, eq(accessSessions.requesterId, requesterUsers.id))
    .leftJoin(ratings, eq(ratings.accessSessionId, accessSessions.id))
    .where(
      direction === "incoming"
        ? eq(accessSessions.ownerId, session.userId)
        : eq(accessSessions.requesterId, session.userId)
    )
    .orderBy(desc(accessSessions.approvedAt));

  return ok({
    sessions: rows.map((r) => ({
      ...r.accessSession,
      membershipName: r.membershipName,
      ownerName: r.ownerName,
      requesterName: r.requesterName,
      rating: r.rating,
    })),
  });
});
