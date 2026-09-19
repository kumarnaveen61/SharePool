import { db } from "@/lib/db";
import { pendingProviders, providerCatalog, users } from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, withErrorHandling } from "@/lib/api-response";
import { desc, eq } from "drizzle-orm";

export const GET = withErrorHandling(async () => {
  const session = await requireUser();
  requireSuperAdmin(session);

  const pending = await db
    .select({
      id: pendingProviders.id,
      category: pendingProviders.category,
      suggestedName: pendingProviders.suggestedName,
      createdAt: pendingProviders.createdAt,
      submittedByName: users.name,
      submittedByEmail: users.email,
    })
    .from(pendingProviders)
    .innerJoin(users, eq(pendingProviders.submittedBy, users.id))
    .where(eq(pendingProviders.status, "PENDING"))
    .orderBy(desc(pendingProviders.createdAt));

  const catalog = await db
    .select({
      id: providerCatalog.id,
      category: providerCatalog.category,
      name: providerCatalog.name,
      isActive: providerCatalog.isActive,
      createdAt: providerCatalog.createdAt,
    })
    .from(providerCatalog)
    .orderBy(providerCatalog.category, providerCatalog.name);

  return ok({ pending, catalog });
});
