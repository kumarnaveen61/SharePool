import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { createGroupSchema } from "@/lib/validation/schemas";
import { ok, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

function generateInviteCode(): string {
  return randomBytes(6)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
}

export const GET = withErrorHandling(async () => {
  const session = await requireUser();

  const rows = await db
    .select({
      group: groups,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, session.userId));

  return ok({ groups: rows.map((r) => ({ ...r.group, myRole: r.role })) });
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = createGroupSchema.parse(body);

  // Retry on the (astronomically unlikely) invite-code collision.
  let inviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const [collision] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode))
      .limit(1);
    if (!collision) break;
    inviteCode = generateInviteCode();
  }

  const group = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(groups)
      .values({
        name: data.name,
        description: data.description,
        ownerId: session.userId,
        inviteCode,
        memberLimit: data.memberLimit ?? 20,
        rules: data.rules,
      })
      .returning();

    await tx.insert(groupMembers).values({
      groupId: created.id,
      userId: session.userId,
      role: "OWNER",
    });

    return created;
  });

  return ok({ group }, 201);
});
