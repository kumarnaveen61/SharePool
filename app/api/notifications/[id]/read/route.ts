import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";

export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id } = await ctx.params;

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, session.userId)))
      .returning();

    if (!updated) {
      return fail("NOTIFICATION_NOT_FOUND", "Notification not found.", 404);
    }

    return ok({ notification: updated });
  }
);
