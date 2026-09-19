import Link from "next/link";

export type ActivityRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
  actorName: string | null;
};

const ACTION_META: Record<
  string,
  { emoji: string; verb: (actor: string, meta: any) => string }
> = {
  MEMBERSHIP_CREATED: {
    emoji: "➕",
    verb: (a, m) => `${a} listed ${m?.name ?? "a subscription"}`,
  },
  MEMBERSHIP_REMOVED: {
    emoji: "🗑️",
    verb: (a, m) => `${a} removed ${m?.name ?? "a listing"}`,
  },
  ACCESS_REQUESTED: {
    emoji: "📥",
    verb: (a, m) => `${a} requested access to ${m?.membershipName ?? "a subscription"}`,
  },
  ACCESS_APPROVED: {
    emoji: "✅",
    verb: (a, m) => `${a} approved ${m?.requesterName ?? "a request"} for ${m?.membershipName ?? "a subscription"}`,
  },
  ACCESS_REJECTED: {
    emoji: "❌",
    verb: (a, m) => `${a} rejected ${m?.requesterName ?? "a request"}`,
  },
  MEMBER_JOINED: {
    emoji: "👋",
    verb: (a) => `${a} joined the group`,
  },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityFeed({ items }: { items: ActivityRow[] }) {
  if (items.length === 0) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold tracking-tight">
            Recent activity
          </h2>
          <p className="mt-1 text-xs text-muted">
            What&apos;s happening in your group.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <div className="text-3xl">🌱</div>
          <p className="mt-3 text-sm text-muted">
            Nothing yet. Share a subscription to get things started.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight">
          Recent activity
        </h2>
        <p className="mt-1 text-xs text-muted">
          What&apos;s happening in your group.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="divide-y divide-border">
          {items.map((row) => {
            const meta = ACTION_META[row.action] ?? {
              emoji: "•",
              verb: (a: string) => `${a} did something`,
            };
            let parsed: any = null;
            try {
              parsed = row.metadata ? JSON.parse(row.metadata) : null;
            } catch {
              parsed = null;
            }
            const actor = row.actorName ?? "Someone";
            const text = meta.verb(actor, parsed);

            const href =
              row.entityType === "membership" && row.entityId
                ? `/memberships/${row.entityId}`
                : null;

            const inner = (
              <div className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-base">
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">{text}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {timeAgo(row.createdAt)}
                  </p>
                </div>
              </div>
            );

            return href ? (
              <Link key={row.id} href={href} className="block">
                {inner}
              </Link>
            ) : (
              <div key={row.id}>{inner}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}