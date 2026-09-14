import { db } from "@/lib/db";
import { verificationTokens, users } from "@/lib/db/schema";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({ token: z.string().min(10) });

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const { token } = bodySchema.parse(body);

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        isNull(verificationTokens.usedAt),
        gt(verificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!record) {
    return fail(
      "INVALID_OR_EXPIRED_TOKEN",
      "This verification link is invalid or has expired.",
      400
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, record.id));

    await tx
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, record.userId));
  });

  return ok({ verified: true });
});
