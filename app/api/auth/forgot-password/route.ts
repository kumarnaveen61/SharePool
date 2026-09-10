import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { ok, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { generateToken, PASSWORD_RESET_TTL_MS } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { z } from "zod";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const { email } = bodySchema.parse(body);

  const limited = rateLimitOrNull(
    req,
    "forgot-password",
    email,
    RATE_LIMITS.forgotPassword.max,
    RATE_LIMITS.forgotPassword.windowMs
  );
  if (limited) return limited;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Always return the same success response whether or not the email
  // exists — otherwise this endpoint becomes a way to enumerate accounts.
  let devLink: string | undefined;
  if (user) {
    const token = generateToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
    const { link } = await sendPasswordResetEmail(user.email, token);
    devLink = link;
  }

  return ok({
    sent: true,
    message: "If an account exists for that email, a reset link has been sent.",
    ...(process.env.NODE_ENV !== "production" && devLink ? { devResetLink: devLink } : {}),
  });
});
