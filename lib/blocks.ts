import { db } from "@/lib/db";
import { blockedUsers } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";

/** IDs of users that `userId` has blocked within this group. */
export async function getBlockedUserIds(groupId: string, userId: string) {
  const rows = await db
    .select({ blockedId: blockedUsers.blockedId })
    .from(blockedUsers)
    .where(and(eq(blockedUsers.groupId, groupId), eq(blockedUsers.blockerId, userId)));
  return rows.map((r) => r.blockedId);
}

/** True if either user has blocked the other within this group. */
export async function isBlockedEitherWay(
  groupId: string,
  userIdA: string,
  userIdB: string
) {
  const [row] = await db
    .select({ id: blockedUsers.id })
    .from(blockedUsers)
    .where(
      and(
        eq(blockedUsers.groupId, groupId),
        or(
          and(eq(blockedUsers.blockerId, userIdA), eq(blockedUsers.blockedId, userIdB)),
          and(eq(blockedUsers.blockerId, userIdB), eq(blockedUsers.blockedId, userIdA))
        )
      )
    )
    .limit(1);
  return !!row;
}
