import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { joinGroupSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, count, eq } from "drizzle-orm";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = joinGroupSchema.parse(body);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, data.inviteCode.toUpperCase()))
    .limit(1);

  if (!group) {
    return fail("INVALID_INVITE_CODE", "That invite code is not valid.", 404);
  }

  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, session.userId)
      )
    )
    .limit(1);

  if (existing) {
    return fail("ALREADY_MEMBER", "You are already in this group.", 409);
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, group.id));

  if (memberCount >= group.memberLimit) {
    return fail(
      "GROUP_FULL",
      "This group has reached its member limit.",
      409
    );
  }

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: session.userId,
    role: "MEMBER",
  });

  return ok({ group }, 201);
});
