import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { generateToken, EMAIL_VERIFICATION_TTL_MS } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

export const POST = withErrorHandling(async () => {
  const session = await requireUser();

  // Keyed by user id, not IP — this endpoint requires an authenticated
  // session already, so the account itself is the right rate-limit key.
  const limit = checkRateLimit(
    `resend-verification:${session.userId}`,
    RATE_LIMITS.resendVerification.max,
    RATE_LIMITS.resendVerification.windowMs
  );
  if (!limit.allowed) {
    return fail(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${limit.retryAfterSeconds}s.`,
      429
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return fail("USER_NOT_FOUND", "Account not found.", 404);
  if (user.emailVerified) {
    return fail("ALREADY_VERIFIED", "Your email is already verified.", 400);
  }

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });
  const { link } = await sendVerificationEmail(user.email, token);

  return ok({
    sent: true,
    ...(process.env.NODE_ENV !== "production" ? { devVerificationLink: link } : {}),
  });
});
