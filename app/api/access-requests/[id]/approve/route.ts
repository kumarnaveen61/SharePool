import { db } from "@/lib/db";
import { accessRequests, accessSessions, memberships } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { adjustCredits, CREDIT_RULES } from "@/lib/credits";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: requestId } = await ctx.params;

    const [request] = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (!request) {
      return fail("REQUEST_NOT_FOUND", "Request not found.", 404);
    }

    // Only the membership's owner may approve — never trust a client-side
    // "Approve" button being merely hidden from non-owners.
    if (request.ownerId !== session.userId) {
      return fail(
        "NOT_OWNER",
        "Only the membership owner can approve this request.",
        403
      );
    }

    if (request.status !== "PENDING") {
      return fail(
        "ALREADY_DECIDED",
        `This request was already ${request.status.toLowerCase()}.`,
        409
      );
    }

    const [membership] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, request.membershipId))
      .limit(1);

    if (!membership) {
      return fail("MEMBERSHIP_NOT_FOUND", "Membership not found.", 404);
    }

    // Re-validate at approval time too — availability may have changed
    // since the request was made.
    const isQuantityBased = membership.remainingUnits !== null;
    if (isQuantityBased) {
      const units = request.requestedUnits ?? 1;
      if (units > (membership.remainingUnits ?? 0)) {
        return fail(
          "INSUFFICIENT_UNITS",
          `Only ${membership.remainingUnits} unit(s) remaining now.`,
          409
        );
      }
    } else if (membership.status !== "AVAILABLE") {
      return fail(
        "NOT_AVAILABLE",
        "This membership is no longer available.",
        409
      );
    }

    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [updatedRequest] = await tx
        .update(accessRequests)
        .set({ status: "APPROVED", decidedAt: now })
        .where(eq(accessRequests.id, requestId))
        .returning();

      const [newSession] = await tx
        .insert(accessSessions)
        .values({
          accessRequestId: requestId,
          membershipId: membership.id,
          ownerId: membership.ownerId,
          requesterId: request.requesterId,
          startTime: request.requestedStartTime ?? now,
          endTime: request.requestedEndTime,
          units: request.requestedUnits,
          // Quantity-based benefits (lounge visits, vouchers) are used up
          // the instant they're granted — there's no time window to wait
          // out, so the session is COMPLETED immediately. Time-based
          // memberships stay ACTIVE until the window passes (see the lazy
          // expiry helper).
          status: isQuantityBased ? "COMPLETED" : "ACTIVE",
          approvedAt: now,
          completedAt: isQuantityBased ? now : undefined,
        })
        .returning();

      if (isQuantityBased) {
        const units = request.requestedUnits ?? 1;
        const remaining = (membership.remainingUnits ?? 0) - units;
        await tx
          .update(memberships)
          .set({
            remainingUnits: remaining,
            status: remaining <= 0 ? "UNAVAILABLE" : membership.status,
            updatedAt: now,
          })
          .where(eq(memberships.id, membership.id));
      } else {
        await tx
          .update(memberships)
          .set({ status: "IN_USE", updatedAt: now })
          .where(eq(memberships.id, membership.id));
      }

      await adjustCredits(tx, {
        groupId: membership.groupId,
        userId: request.requesterId,
        amount: CREDIT_RULES.BENEFIT_USED,
        reason: "BENEFIT_USED",
        relatedAccessSessionId: newSession.id,
      });

      return { updatedRequest, newSession };
    });

    await notify({
      userId: request.requesterId,
      type: "REQUEST_APPROVED",
      title: `Your request for ${membership.name} was approved`,
      body: request.requestedEndTime
        ? `You have access until ${new Date(request.requestedEndTime).toLocaleString()}.`
        : `Your request was approved.`,
      relatedMembershipId: membership.id,
      relatedAccessRequestId: requestId,
    });

    return ok(result);
  }
);
