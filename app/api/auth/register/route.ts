import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { generateToken, EMAIL_VERIFICATION_TTL_MS } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/mailer";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const data = registerSchema.parse(body);

  const limited = rateLimitOrNull(
    req,
    "register",
    undefined,
    RATE_LIMITS.register.max,
    RATE_LIMITS.register.windowMs
  );
  if (limited) return limited;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing) {
    return fail(
      "EMAIL_IN_USE",
      "An account with this email already exists.",
      409
    );
  }

  const passwordHash = await hashPassword(data.password);

  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      sessionVersion: users.sessionVersion,
    });

  const token = generateToken();
  await db.insert(verificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });
  const { link } = await sendVerificationEmail(user.email, token);

  const sessionToken = signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });
  await setSessionCookie(sessionToken);

  return ok(
    {
      user,
      // No real mail provider is reachable in this environment, so the
      // verification link is returned directly outside production so it
      // can still be tested. A real deployment would only email it.
      ...(process.env.NODE_ENV !== "production" ? { devVerificationLink: link } : {}),
    },
    201
  );
});
