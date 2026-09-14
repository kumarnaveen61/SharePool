import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await ctx.params;

    const [existing] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.id, id), eq(memberships.ownerId, session.userId))
      )
      .limit(1);

    if (!existing) {
      return fail("NOT_FOUND", "Membership not found or not yours.", 404);
    }

    const nextStatus =
      existing.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

    const [updated] = await db
      .update(memberships)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(memberships.id, id))
      .returning();

    return ok({ membership: updated });
  }
);