import { db } from "@/lib/db";
import { memberships, users } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { createMembershipSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq, ilike, notInArray, or } from "drizzle-orm";
import { adjustCredits, CREDIT_RULES } from "@/lib/credits";
import { expireOverdueSessions } from "@/lib/session-expiry";
import { getBlockedUserIds } from "@/lib/blocks";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const search = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const availableOnly = searchParams.get("availableOnly") === "true";

  if (!groupId) {
    return fail("MISSING_GROUP_ID", "groupId is required.", 400);
  }

  // Authorization gate: caller must belong to this group. This is what
  // prevents a user from reading another group's memberships by editing
  // the groupId query param.
  await requireGroupMembership(session.userId, groupId);

  // Lazily flip any sessions whose end time has passed before we read
  // membership status, so "IN_USE" doesn't linger past its actual window.
  await expireOverdueSessions();

  const conditions = [eq(memberships.groupId, groupId)];
  if (search) {
    conditions.push(
      or(
        ilike(memberships.name, `%${search}%`),
        ilike(memberships.provider, `%${search}%`),
        ilike(memberships.description, `%${search}%`)
      )!
    );
  }
  if (category) {
    conditions.push(eq(memberships.category, category as any));
  }
  if (availableOnly) {
    conditions.push(eq(memberships.status, "AVAILABLE"));
  }

  // Never show memberships from people I've blocked in this group.
  const blockedIds = await getBlockedUserIds(groupId, session.userId);
  if (blockedIds.length > 0) {
    conditions.push(notInArray(memberships.ownerId, blockedIds));
  }

  const rows = await db
    .select({
      membership: memberships,
      ownerName: users.name,
      ownerAvatarUrl: users.avatarUrl,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.ownerId, users.id))
    .where(and(...conditions));

  return ok({
    memberships: rows.map((r) => ({
      ...r.membership,
      owner: { name: r.ownerName, avatarUrl: r.ownerAvatarUrl },
    })),
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = createMembershipSchema.parse(body);

  // Confirm membership in the target group before allowing a contribution.
  await requireGroupMembership(session.userId, data.groupId);

  const membership = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(memberships)
      .values({
        groupId: data.groupId,
        ownerId: session.userId,
        name: data.name,
        category: data.category,
        provider: data.provider,
        planName: data.planName,
        description: data.description,
        sharingEligibility: data.sharingEligibility,
        maxSimultaneousUsers: data.maxSimultaneousUsers ?? 1,
        totalUnits: data.totalUnits,
        remainingUnits: data.totalUnits,
        status: "UNAVAILABLE", // owner must explicitly set availability next
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      })
      .returning();

    await adjustCredits(tx, {
      groupId: data.groupId,
      userId: session.userId,
      amount: CREDIT_RULES.MEMBERSHIP_CONTRIBUTED,
      reason: "MEMBERSHIP_CONTRIBUTED",
    });

    return created;
  });

  return ok({ membership }, 201);
});
