import { db } from "@/lib/db";
import { memberships, membershipAvailability } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { setAvailabilitySchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { adjustCredits, CREDIT_RULES } from "@/lib/credits";

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;
    const body = await req.json();
    const data = setAvailabilitySchema.parse({ ...body, membershipId });

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .limit(1);

    if (!membership) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    await requireGroupMembership(session.userId, membership.groupId);

    // Ownership check — never trust the frontend to only show this button
    // to the owner. A user must never be able to change someone else's
    // membership availability.
    if (membership.ownerId !== session.userId) {
      return fail(
        "NOT_OWNER",
        "Only the membership owner can set availability.",
        403
      );
    }

    // The core compliance rule from the product spec: a membership marked
    // NOT_SHAREABLE must never be offered, regardless of what the client sends.
    if (membership.sharingEligibility === "NOT_SHAREABLE") {
      return fail(
        "NOT_SHAREABLE",
        "This membership is marked Not Shareable and cannot be made available. Only share memberships and benefits in ways permitted by the provider's current terms.",
        422
      );
    }

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (endTime <= startTime) {
      return fail(
        "INVALID_TIME_RANGE",
        "End time must be after start time.",
        422
      );
    }

    const [availability, updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(membershipAvailability)
        .values({ membershipId, startTime, endTime })
        .returning();

      const [membershipRow] = await tx
        .update(memberships)
        .set({ status: "AVAILABLE", updatedAt: new Date() })
        .where(eq(memberships.id, membershipId))
        .returning();

      await adjustCredits(tx, {
        groupId: membership.groupId,
        userId: session.userId,
        amount: CREDIT_RULES.BENEFIT_MADE_AVAILABLE,
        reason: "BENEFIT_MADE_AVAILABLE",
      });

      return [row, membershipRow];
    });

    return ok({ availability, membership: updated }, 201);
  }
);
