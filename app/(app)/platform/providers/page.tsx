import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pendingProviders, providerCatalog, users } from "@/lib/db/schema";
import { desc, eq, count } from "drizzle-orm";
import { ProviderReviewActions } from "@/components/platform/ProviderReviewActions";

export default async function PlatformProvidersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

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

  const catalogByCategory = await db
    .select({
      category: providerCatalog.category,
      total: count(),
    })
    .from(providerCatalog)
    .groupBy(providerCatalog.category);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Admin · Providers
        </h1>
        <p className="mt-2 text-sm text-muted">
          Review provider suggestions from your users. Approved names appear
          in the dropdown for everyone.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Pending suggestions
            </h2>
            <p className="mt-1 text-xs text-muted">
              {pending.length}{" "}
              {pending.length === 1 ? "suggestion" : "suggestions"} to review
            </p>
          </div>
          <span className="rounded-full bg-amber-bg px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <div className="text-4xl">✨</div>
            <h3 className="mt-4 text-sm font-extrabold tracking-tight">
              No pending suggestions
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted">
              When a user adds a provider under &ldquo;Others&rdquo;, it will
              show up here for review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-extrabold">
                        {p.suggestedName}
                      </span>
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                        {p.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      Suggested by{" "}
                      <span className="font-semibold text-ink">
                        {p.submittedByName}
                      </span>{" "}
                      ({p.submittedByEmail}) ·{" "}
                      {new Date(p.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  <ProviderReviewActions
                    id={p.id}
                    suggestedName={p.suggestedName}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold tracking-tight">
            Provider catalog
          </h2>
          <p className="mt-1 text-xs text-muted">
            Master list per category. Users see these in the dropdown.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalogByCategory.map((c) => (
            <div
              key={c.category}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="text-sm font-extrabold">
                {c.category.replace(/_/g, " ")}
              </div>
              <div className="mt-1 text-xs text-muted">
                {Number(c.total)}{" "}
                {Number(c.total) === 1 ? "provider" : "providers"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
