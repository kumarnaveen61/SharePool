import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { clearSessionCookie } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/api-response";
import { eq, sql } from "drizzle-orm";

export const POST = withErrorHandling(async () => {
  const session = await requireUser();

  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, session.userId));

  // Also clear this device's cookie so it doesn't hold a now-invalid
  // token in the browser until it happens to make another request.
  await clearSessionCookie();

  return ok({ loggedOutEverywhere: true });
});
