import { db } from "@/lib/db";
import { accessRequests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/notifications";

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

    if (request.requesterId !== session.userId) {
      return fail(
        "NOT_REQUESTER",
        "Only the person who made the request can cancel it.",
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

    const [updated] = await db
      .update(accessRequests)
      .set({ status: "CANCELLED", decidedAt: new Date() })
      .where(eq(accessRequests.id, requestId))
      .returning();

    await notify({
      userId: request.ownerId,
      type: "REQUEST_CANCELLED",
      title: "A request to your membership was cancelled",
      relatedMembershipId: request.membershipId,
      relatedAccessRequestId: requestId,
    });

    return ok({ request: updated });
  }
);
