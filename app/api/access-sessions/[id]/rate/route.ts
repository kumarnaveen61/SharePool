import { db } from "@/lib/db";
import { accessSessions, ratings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { createRatingSchema } from "@/lib/validation/rating-schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: sessionId } = await ctx.params;
    const body = await req.json();
    const data = createRatingSchema.parse(body);

    const [accessSession] = await db
      .select()
      .from(accessSessions)
      .where(eq(accessSessions.id, sessionId))
      .limit(1);

    if (!accessSession) {
      return fail("SESSION_NOT_FOUND", "Session not found.", 404);
    }

    // Only the requester (the person who actually used the benefit) can
    // rate it — never the owner. This is what "avoid allowing users to
    // manipulate ratings by repeatedly rating themselves" means in
    // practice: an owner can never be the rater on their own session.
    if (accessSession.requesterId !== session.userId) {
      return fail(
        "NOT_REQUESTER",
        "Only the person who used this can rate it.",
        403
      );
    }

    // Belt-and-braces: even if requesterId were somehow forged, never let
    // someone rate themselves.
    if (accessSession.ownerId === accessSession.requesterId) {
      return fail("CANNOT_RATE_SELF", "You can't rate your own usage.", 400);
    }

    if (accessSession.status !== "COMPLETED" && accessSession.status !== "EXPIRED") {
      return fail(
        "SESSION_NOT_DONE",
        "You can only rate a session after it's finished.",
        409
      );
    }

    const [existing] = await db
      .select({ id: ratings.id })
      .from(ratings)
      .where(eq(ratings.accessSessionId, sessionId))
      .limit(1);

    if (existing) {
      return fail(
        "ALREADY_RATED",
        "You've already rated this session.",
        409
      );
    }

    const [rating] = await db
      .insert(ratings)
      .values({
        accessSessionId: sessionId,
        raterId: session.userId,
        rateeId: accessSession.ownerId,
        stars: data.stars,
        feedback: data.feedback,
      })
      .returning();

    return ok({ rating }, 201);
  }
);
