import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  memberLimit: z.number().int().min(2).max(50).optional(),
  rules: z.string().trim().max(2000).optional(),
});

export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    requireSuperAdmin(session);
    const { id } = await ctx.params;

    const body = await req.json();
    const data = updateGroupSchema.parse(body);

    if (Object.keys(data).length === 0) {
      return fail("NOTHING_TO_UPDATE", "No fields provided.", 400);
    }

    const [updated] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();

    if (!updated) {
      return fail("NOT_FOUND", "Group not found.", 404);
    }

    return ok({ group: updated });
  }
);

export const DELETE = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    requireSuperAdmin(session);
    const { id } = await ctx.params;

    const [deleted] = await db
      .delete(groups)
      .where(eq(groups.id, id))
      .returning({ id: groups.id, name: groups.name });

    if (!deleted) {
      return fail("NOT_FOUND", "Group not found.", 404);
    }

    return ok({ deleted });
  }
);