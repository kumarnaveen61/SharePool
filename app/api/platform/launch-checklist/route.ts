import { db } from "@/lib/db";
import { launchChecklistItems } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { asc } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  const session = await requireUser();
  requireSuperAdmin(session);

  const items = await db
    .select()
    .from(launchChecklistItems)
    .orderBy(asc(launchChecklistItems.category), asc(launchChecklistItems.sortOrder));

  return ok({ items });
});
