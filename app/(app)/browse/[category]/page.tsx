import Link from "next/link";
import { notFound } from "next/navigation";
import { ProviderLogo } from "@/components/ProviderLogo";
import { db } from "@/lib/db";
import { providerCatalog } from "@/lib/db/schema";
import { ensureCatalogSeeded } from "@/lib/providers-catalog";
import {
  CATEGORY_LABELS,
  CATEGORY_PROVIDERS,
  PROVIDER_SLUGS,
  PROVIDER_DOMAINS,
} from "@/lib/providers";
import { and, asc, eq } from "drizzle-orm";

export default async function BrowseCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const staticProviders = CATEGORY_PROVIDERS[category];

  if (!staticProviders) notFound();

  const label = CATEGORY_LABELS[category] ?? category;

  // Seed the catalog from static list (idempotent)
  await ensureCatalogSeeded(category);

  // Fetch all active providers for this category from the DB
  const dbProviders = await db
    .select({ name: providerCatalog.name })
    .from(providerCatalog)
    .where(
      and(
        eq(providerCatalog.category, category as never),
        eq(providerCatalog.isActive, true)
      )
    )
    .orderBy(asc(providerCatalog.name));

  // Merge static + DB, dedupe, sort alphabetically
  const merged = Array.from(
    new Set([
      ...staticProviders,
      ...dbProviders.map((p) => p.name),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-muted hover:text-ink"
        >
          &larr; Back to Quick Services
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{label}</h1>
        <p className="mt-2 text-sm text-muted">
          Tap a provider to see who&apos;s sharing slots in your group.
        </p>
      </div>

      {merged.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">
            No providers configured for this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {merged.map((provider) => (
            <Link
              key={provider}
              href={`/memberships?category=${category}&q=${encodeURIComponent(provider)}`}
              className="group flex flex-col items-center gap-3 text-center"
            >
              <ProviderLogo
                name={provider}
                slug={PROVIDER_SLUGS[provider]}
                domain={PROVIDER_DOMAINS[provider]}
                size={72}
              />
              <span className="max-w-[90px] text-[11px] font-semibold leading-tight text-ink">
                {provider}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}