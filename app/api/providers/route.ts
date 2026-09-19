import { db } from "@/lib/db";
import { providerCatalog } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { ensureCatalogSeeded } from "@/lib/providers-catalog";
import { and, asc, eq } from "drizzle-orm";

export const GET = withErrorHandling(async (req: Request) => {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  if (!category) {
    return fail("MISSING_CATEGORY", "category is required.", 400);
  }

  await ensureCatalogSeeded(category);

  const rows = await db
    .select({ id: providerCatalog.id, name: providerCatalog.name })
    .from(providerCatalog)
    .where(
      and(
        eq(providerCatalog.category, category as never),
        eq(providerCatalog.isActive, true)
      )
    )
    .orderBy(asc(providerCatalog.name));

  return ok({ providers: rows });
});
