import { generatePublicId } from "@/lib/publicId";
import { db } from "@/lib/db";
import {
  memberships,
  users,
  accessSessions,
} from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { createMembershipSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq, ilike, notInArray, or, sql } from "drizzle-orm";
import { adjustCredits, CREDIT_RULES } from "@/lib/credits";
import { expireOverdueSessions } from "@/lib/session-expiry";
import { getBlockedUserIds } from "@/lib/blocks";
import { logActivity } from "@/lib/activity";

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

  await requireGroupMembership(session.userId, groupId);
  await expireOverdueSessions();

  const conditions = [eq(memberships.groupId, groupId)];
  if (search) {
    conditions.push(
      or(
        ilike(memberships.name, `%${search}%`),
        ilike(memberships.provider, `%${search}%`),
        ilike(memberships.planName, `%${search}%`),
        ilike(memberships.description, `%${search}%`)
      )!
    );
  }
  if (category) {
    conditions.push(eq(memberships.category, category as never));
  }
  if (availableOnly) {
    conditions.push(eq(memberships.status, "AVAILABLE"));
  }

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

  // Count active sessions per membership
  const activeRows = await db
    .select({ membershipId: accessSessions.membershipId })
    .from(accessSessions)
    .where(eq(accessSessions.status, "ACTIVE"));

  const activeMap = new Map<string, number>();
  for (const r of activeRows) {
    activeMap.set(r.membershipId, (activeMap.get(r.membershipId) ?? 0) + 1);
  }

  return ok({
    memberships: rows.map((r) => ({
      ...r.membership,
      owner: { name: r.ownerName, avatarUrl: r.ownerAvatarUrl },
      activeCount: activeMap.get(r.membership.id) ?? 0,
    })),
  });
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = createMembershipSchema.parse(body);

    await requireGroupMembership(session.userId, data.groupId);

  // ── Duplicate check ────────────────────────────────────────
  // Same owner + same provider + same account label = duplicate.
  // Same owner + same provider + DIFFERENT label = allowed
  // (user owns multiple accounts from the same provider).
  const normalizedProvider = (data.provider ?? "").trim().toLowerCase();
  const normalizedLabel = data.name.trim().toLowerCase();

  if (normalizedProvider && normalizedLabel) {
    const existing = await db
      .select({ id: memberships.id, name: memberships.name })
      .from(memberships)
      .where(
        and(
          eq(memberships.ownerId, session.userId),
          eq(memberships.groupId, data.groupId),
          sql`lower(${memberships.provider}) = ${normalizedProvider}`,
          sql`lower(${memberships.name}) = ${normalizedLabel}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return fail(
        "DUPLICATE_MEMBERSHIP",
        `You already have a ${data.provider} account saved as "${existing[0].name}". If this is a different account, use a different Account Label (e.g. "Personal", "Family").`,
        409
      );
    }
  }

  const publicId = generatePublicId();

  const membership = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(memberships)
      .values({
        groupId: data.groupId,
        ownerId: session.userId,
        name: data.name,
        publicId,
        category: data.category,
        provider: data.provider,
        planName: data.planName,
        description: data.description,
        sharingEligibility: data.sharingEligibility,
        maxSimultaneousUsers: data.maxSimultaneousUsers ?? 1,
        totalUnits: data.totalUnits,
        remainingUnits: data.totalUnits,
        priceAmount: data.priceAmount,
        priceCurrency: data.priceCurrency ?? "INR",
        pricePeriod: data.pricePeriod,
        status: "UNAVAILABLE",
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

  await logActivity({
    groupId: data.groupId,
    actorId: session.userId,
    action: "MEMBERSHIP_CREATED",
    entityType: "membership",
    entityId: membership.id,
    metadata: { name: membership.name },
  });

  return ok({ membership }, 201);
});