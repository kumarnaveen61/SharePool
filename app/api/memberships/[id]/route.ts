import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { z } from "zod";
import {
  memberships,
  users,
  membershipAvailability,
  accessRequests,
  accessSessions,
} from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, desc, eq } from "drizzle-orm";
import { expireOverdueSessions } from "@/lib/session-expiry";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await ctx.params;

    const [row] = await db
      .select({ membership: memberships, ownerName: users.name })
      .from(memberships)
      .innerJoin(users, eq(memberships.ownerId, users.id))
      .where(eq(memberships.id, id))
      .limit(1);

    if (!row) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    const callerMembership = await requireGroupMembership(
      session.userId,
      row.membership.groupId
    );
    await expireOverdueSessions(id);

    const [freshMembership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, id))
      .limit(1);

    const upcomingAvailability = await db
      .select()
      .from(membershipAvailability)
      .where(eq(membershipAvailability.membershipId, id))
      .orderBy(desc(membershipAvailability.startTime))
      .limit(5);

    const isOwner = row.membership.ownerId === session.userId;
    const isCallerAdmin =
      callerMembership.role === "OWNER" || callerMembership.role === "ADMIN";

    const pendingRequests = isOwner
      ? await db
          .select()
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.membershipId, id),
              eq(accessRequests.status, "PENDING")
            )
          )
      : [];

    const myPendingRequest = !isOwner
      ? (
          await db
            .select()
            .from(accessRequests)
            .where(
              and(
                eq(accessRequests.membershipId, id),
                eq(accessRequests.requesterId, session.userId),
                eq(accessRequests.status, "PENDING")
              )
            )
            .limit(1)
        )[0] ?? null
      : null;

    // Active members — people who have current access to this membership
    const activeMembersRaw = await db
      .select({
        sessionId: accessSessions.id,
        userId: accessSessions.requesterId,
        userName: users.name,
        startTime: accessSessions.startTime,
        endTime: accessSessions.endTime,
        units: accessSessions.units,
        approvedAt: accessSessions.approvedAt,
      })
      .from(accessSessions)
      .innerJoin(users, eq(accessSessions.requesterId, users.id))
      .where(
        and(
          eq(accessSessions.membershipId, id),
          eq(accessSessions.status, "ACTIVE")
        )
      )
      .orderBy(desc(accessSessions.approvedAt));

    return ok({
      membership: freshMembership ?? row.membership,
      ownerName: row.ownerName,
      isOwner,
      isCallerAdmin,
      upcomingAvailability,
      pendingRequests,
      myPendingRequest,
      activeMembers: activeMembersRaw,
    });
  }
);


const updateMembershipSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.enum([
    "OTT",
    "MUSIC",
    "SHOPPING",
    "FOOD_DELIVERY",
    "PHARMACY",
    "HEALTHCARE",
    "TRAVEL",
    "AIRPORT_LOUNGE",
    "MOVIES",
    "FITNESS",
    "SOFTWARE",
    "EDUCATION",
    "HOTEL",
    "CREDIT_CARD_BENEFITS",
    "OTHER",
  ]).optional(),
  provider: z.string().trim().max(120).optional(),
  planName: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  sharingEligibility: z
    .enum([
      "OFFICIALLY_SHAREABLE",
      "OWNER_ASSISTED",
      "TRANSFERABLE_BENEFIT",
      "NOT_SHAREABLE",
    ])
    .optional(),
});

export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await ctx.params;

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, id))
      .limit(1);

    if (!membership) {
      return fail("NOT_FOUND", "Membership not found.", 404);
    }

    if (membership.ownerId !== session.userId) {
      return fail(
        "NOT_OWNER",
        "Only the owner can edit this membership.",
        403
      );
    }

    const body = await req.json();
    const data = updateMembershipSchema.parse(body);

    if (Object.keys(data).length === 0) {
      return fail("NOTHING_TO_UPDATE", "No fields provided.", 400);
    }

    const [updated] = await db
      .update(memberships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(memberships.id, id))
      .returning();

    await logActivity({
      groupId: membership.groupId,
      actorId: session.userId,
      action: "MEMBERSHIP_UPDATED",
      entityType: "membership",
      entityId: membership.id,
      metadata: { name: updated.name },
    });

    return ok({ membership: updated });
  }
);