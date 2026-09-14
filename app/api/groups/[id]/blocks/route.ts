import { db } from "@/lib/db";
import { blockedUsers, users } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({ userId: z.string().uuid() });

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: groupId } = await ctx.params;
    await requireGroupMembership(session.userId, groupId);

    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(blockedUsers)
      .innerJoin(users, eq(blockedUsers.blockedId, users.id))
      .where(and(eq(blockedUsers.groupId, groupId), eq(blockedUsers.blockerId, session.userId)));

    return ok({ blocked: rows });
  }
);

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: groupId } = await ctx.params;
    await requireGroupMembership(session.userId, groupId);

    const body = await req.json();
    const { userId: targetUserId } = bodySchema.parse(body);

    if (targetUserId === session.userId) {
      return fail("CANNOT_BLOCK_SELF", "You can't block yourself.", 400);
    }

    await requireGroupMembership(targetUserId, groupId);

    await db
      .insert(blockedUsers)
      .values({ groupId, blockerId: session.userId, blockedId: targetUserId })
      .onConflictDoNothing();

    return ok({ blocked: true }, 201);
  }
);
