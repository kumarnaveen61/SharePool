import Link from "next/link";

export type ExpiringItem = {
  id: string;
  name: string;
  provider: string | null;
  renewalDate: string | null;
  expiryDate: string | null;
  isOwner: boolean;
};

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function daysLabel(days: number) {
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days} days`;
  return `${days} days`;
}

export function ExpiringSoon({ items }: { items: ExpiringItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">
            Expiring soon
          </h2>
          <p className="mt-1 text-xs text-muted">
            Renewals coming up in the next week.
          </p>
        </div>
        <span className="rounded-full bg-amber-bg px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gold">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const relevantDate = item.renewalDate ?? item.expiryDate!;
          const days = daysUntil(relevantDate);
          const isUrgent = days <= 2;
          const isExpired = days < 0;

          return (
            <Link
              key={item.id}
              href={`/memberships/${item.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${
                  isExpired
                    ? "bg-red-bg"
                    : isUrgent
                      ? "bg-red-bg"
                      : "bg-amber-bg"
                }`}
              >
                {isExpired ? "⚠️" : isUrgent ? "🔴" : "⏰"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">
                  {item.name}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {item.isOwner
                    ? item.renewalDate
                      ? "Renews"
                      : "Expires"
                    : "Your access ends"}{" "}
                  {new Date(relevantDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                  isExpired
                    ? "bg-red-bg text-red"
                    : isUrgent
                      ? "bg-red-bg text-red"
                      : "bg-amber-bg text-gold"
                }`}
              >
                {daysLabel(days)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}