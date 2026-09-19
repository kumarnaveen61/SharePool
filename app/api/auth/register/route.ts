import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/schemas";
import { ok, fail, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { eq } from "drizzle-orm";
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

  const sessionToken = signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  });
  await setSessionCookie(sessionToken);

  return ok({ user }, 201);
});