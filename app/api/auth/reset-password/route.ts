import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { ok, fail, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

const bodySchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(200),
});

export const POST = withErrorHandling(async (req: Request) => {
  const limited = rateLimitOrNull(
    req,
    "reset-password",
    undefined,
    RATE_LIMITS.resetPassword.max,
    RATE_LIMITS.resetPassword.windowMs
  );
  if (limited) return limited;

  const body = await req.json();
  const { token, newPassword } = bodySchema.parse(body);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!record) {
    return fail(
      "INVALID_OR_EXPIRED_TOKEN",
      "This reset link is invalid or has expired.",
      400
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));

    // Bumping sessionVersion instantly invalidates every session issued
    // before this point — including whatever session an attacker who
    // triggered this reset might already hold.
    await tx
      .update(users)
      .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, record.userId));
  });

  return ok({ reset: true });
});
