import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { count } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  const session = await requireUser();
  requireSuperAdmin(session);

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      memberLimit: groups.memberLimit,
      createdAt: groups.createdAt,
    })
    .from(groups);

  const memberCounts = await db
    .select({ groupId: groupMembers.groupId, count: count() })
    .from(groupMembers)
    .groupBy(groupMembers.groupId);

  const countMap = new Map(
    memberCounts.map((m) => [m.groupId, Number(m.count)])
  );

  return ok({
    groups: rows.map((g) => ({
      ...g,
      memberCount: countMap.get(g.id) ?? 0,
    })),
  });
});