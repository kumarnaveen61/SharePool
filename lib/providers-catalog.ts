import { db } from "@/lib/db";
import { providerCatalog } from "@/lib/db/schema";
import { CATEGORY_PROVIDERS } from "@/lib/providers";
import { eq, count } from "drizzle-orm";

export async function ensureCatalogSeeded(category: string) {
  const [row] = await db
    .select({ c: count() })
    .from(providerCatalog)
    .where(eq(providerCatalog.category, category as never));

  if ((row?.c ?? 0) > 0) return;

  const providers = CATEGORY_PROVIDERS[category] ?? [];
  if (providers.length === 0) return;

  await db
    .insert(providerCatalog)
    .values(
      providers.map((name) => ({
        category: category as never,
        name,
      }))
    )
    .onConflictDoNothing();
}
