import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { requireUser, requireGroupMembership, requireGroupAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/lib/admin-log";
import { z } from "zod";

const updateGroupSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  memberLimit: z.number().int().min(2).max(50).optional(),
  rules: z.string().trim().max(2000).optional(),
});

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: groupId } = await ctx.params;

    const callerMembership = await requireGroupMembership(session.userId, groupId);
    requireGroupAdmin(callerMembership);

    const body = await req.json();
    const data = updateGroupSettingsSchema.parse(body);

    const [updated] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groups.id, groupId))
      .returning();

    await logAdminAction({
      groupId,
      adminId: session.userId,
      action: "UPDATE_GROUP_SETTINGS",
      reason: `Updated: ${Object.keys(data).join(", ")}`,
    });

    return ok({ group: updated });
  }
);
