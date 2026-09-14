import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  const session = await requireUser();

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return ok({ user });
});
