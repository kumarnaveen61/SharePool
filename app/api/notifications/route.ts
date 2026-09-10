import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { and, desc, eq } from "drizzle-orm";

export const GET = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const conditions = [eq(notifications.userId, session.userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return ok({ notifications: rows });
});
