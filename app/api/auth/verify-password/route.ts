import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { verifyPassword } from "@/lib/auth/password";
import { ok, fail, withErrorHandling, rateLimitOrNull } from "@/lib/api-response";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(1).max(200),
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();

  const limited = rateLimitOrNull(
    req,
    "verify-password",
    session.email,
    RATE_LIMITS.login.max,
    RATE_LIMITS.login.windowMs
  );
  if (limited) return limited;

  const body = await req.json();
  const { password } = schema.parse(body);

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return fail("NOT_FOUND", "User not found.", 404);
  }

  const okPw = await verifyPassword(password, user.passwordHash);
  if (!okPw) {
    return fail("INVALID_PASSWORD", "Incorrect password.", 401);
  }

  return ok({ verified: true });
});