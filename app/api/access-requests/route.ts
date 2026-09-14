import { db } from "@/lib/db";
import { accessRequests, memberships, users } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { createAccessRequestSchema } from "@/lib/validation/access-request-schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, desc, eq, or } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { alias } from "drizzle-orm/pg-core";
import { isBlockedEitherWay } from "@/lib/blocks";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const { searchParams } = new URL(req.url);
  // "incoming" = requests other members sent to something I own.
  // "outgoing" = requests I sent to someone else's membership.
  const direction = searchParams.get("direction") ?? "incoming";

  const requesterUsers = alias(users, "requester_users");
  const ownerUsers = alias(users, "owner_users");

  const rows = await db
    .select({
      request: accessRequests,
      membershipName: memberships.name,
      requesterName: requesterUsers.name,
      ownerName: ownerUsers.name,
    })
    .from(accessRequests)
    .innerJoin(memberships, eq(accessRequests.membershipId, memberships.id))
    .innerJoin(requesterUsers, eq(accessRequests.requesterId, requesterUsers.id))
    .innerJoin(ownerUsers, eq(accessRequests.ownerId, ownerUsers.id))
    .where(
      direction === "outgoing"
        ? eq(accessRequests.requesterId, session.userId)
        : eq(accessRequests.ownerId, session.userId)
    )
    .orderBy(desc(accessRequests.createdAt));

  return ok({
    requests: rows.map((r) => ({
      ...r.request,
      membershipName: r.membershipName,
      requesterName: r.requesterName,
      ownerName: r.ownerName,
    })),
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = createAccessRequestSchema.parse(body);

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, data.membershipId))
    .limit(1);

  if (!membership) {
    return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
  }

  // Caller must be in the same group as the membership.
  await requireGroupMembership(session.userId, membership.groupId);

  if (membership.ownerId === session.userId) {
    return fail(
      "CANNOT_REQUEST_OWN_MEMBERSHIP",
      "You can't request access to your own membership.",
      400
    );
  }

  if (membership.sharingEligibility === "NOT_SHAREABLE") {
    return fail(
      "NOT_SHAREABLE",
      "This membership is marked Not Shareable and cannot be requested.",
      422
    );
  }

  if (await isBlockedEitherWay(membership.groupId, session.userId, membership.ownerId)) {
    return fail(
      "BLOCKED",
      "You can't request access to this membership.",
      403
    );
  }

  if (membership.status !== "AVAILABLE") {
    return fail(
      "NOT_AVAILABLE",
      "This membership isn't currently available.",
      409
    );
  }

  // Quantity-based benefits: make sure there's enough remaining.
  if (membership.remainingUnits !== null) {
    const units = data.requestedUnits ?? 1;
    if (units > (membership.remainingUnits ?? 0)) {
      return fail(
        "INSUFFICIENT_UNITS",
        `Only ${membership.remainingUnits} unit(s) remaining.`,
        409
      );
    }
  }

  const [requestingUser] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const [request] = await db
    .insert(accessRequests)
    .values({
      membershipId: membership.id,
      requesterId: session.userId,
      ownerId: membership.ownerId,
      requestedStartTime: data.requestedStartTime
        ? new Date(data.requestedStartTime)
        : undefined,
      requestedEndTime: data.requestedEndTime
        ? new Date(data.requestedEndTime)
        : undefined,
      requestedUnits: data.requestedUnits,
      reason: data.reason,
    })
    .returning();

  await notify({
    userId: membership.ownerId,
    type: "REQUEST_RECEIVED",
    title: `New request for ${membership.name}`,
    body: `${requestingUser?.name ?? "A group member"} requested access to your ${membership.name}.`,
    relatedMembershipId: membership.id,
    relatedAccessRequestId: request.id,
  });

  return ok({ request }, 201);
});
