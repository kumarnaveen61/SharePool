import { db } from "@/lib/db";
import { launchChecklistItems } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  isDone: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    requireSuperAdmin(session);
    const { id } = await ctx.params;

    const body = await req.json();
    const data = bodySchema.parse(body);

    const [updated] = await db
      .update(launchChecklistItems)
      .set({
        isDone: data.isDone,
        notes: data.notes,
        updatedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(launchChecklistItems.id, id))
      .returning();

    if (!updated) {
      return fail("ITEM_NOT_FOUND", "Checklist item not found.", 404);
    }

    return ok({ item: updated });
  }
);
