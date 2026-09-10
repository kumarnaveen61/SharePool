import { db } from "@/lib/db";
import { groups, groupMembers, memberships, users } from "@/lib/db/schema";
import { requireUser, requireGroupMembership } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, count, eq } from "drizzle-orm";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: groupId } = await ctx.params;

    // Enforces that the caller actually belongs to this group before
    // returning anything — never trust the URL param alone.
    await requireGroupMembership(session.userId, groupId);

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) {
      return fail("GROUP_NOT_FOUND", "Group not found.", 404);
    }

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    const [{ value: totalMemberships }] = await db
      .select({ value: count() })
      .from(memberships)
      .where(eq(memberships.groupId, groupId));

    const [{ value: availableNow }] = await db
      .select({ value: count() })
      .from(memberships)
      .where(
        and(eq(memberships.groupId, groupId), eq(memberships.status, "AVAILABLE"))
      );

    return ok({
      group,
      members,
      stats: {
        memberCount: members.length,
        totalMemberships,
        availableNow,
      },
    });
  }
);
