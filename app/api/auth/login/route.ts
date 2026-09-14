import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { RATE_LIMITS } from "@/lib/rate-limit-config";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const data = loginSchema.parse(body);

  // 5 attempts per 15 minutes in production, checked by IP and by the
  // email being guessed — stops both a brute-force spray across accounts
  // from one IP and repeated guessing at a single account from rotating
  // IPs. Limits are more generous outside production (see rate-limit-config.ts).
  const limited = rateLimitOrNull(
    req,
    "login",
    data.email,
    RATE_LIMITS.login.max,
    RATE_LIMITS.login.windowMs
  );
  if (limited) return limited;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  // Deliberately generic message — never reveal whether the email exists.
  const invalidCreds = () =>
    fail("INVALID_CREDENTIALS", "Incorrect email or password.", 401);

  if (!user) return invalidCreds();

  const validPassword = await verifyPassword(data.password, user.passwordHash);
  if (!validPassword) return invalidCreds();

  const token = signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });
  await setSessionCookie(token);

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
});
