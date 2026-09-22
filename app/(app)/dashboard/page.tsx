import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groupMembers, groups, memberships, users } from "@/lib/db/schema";
import { and, count, desc, eq, isNotNull, lte, or } from "drizzle-orm";
import { SearchBar } from "@/components/SearchBar";
import { ExpiringSoon, type ExpiringItem } from "@/components/ExpiringSoon";

const CATEGORY_TILES = [
  { id: "OTT", label: "OTT & TV", icon: "tv" },
  { id: "MUSIC", label: "Music", icon: "music" },
  { id: "SHOPPING", label: "Shopping", icon: "bag" },
  { id: "FOOD_DELIVERY", label: "Food", icon: "food" },
  { id: "PHARMACY", label: "Pharmacy", icon: "pill" },
  { id: "HEALTHCARE", label: "Healthcare", icon: "heart" },
  { id: "TRAVEL", label: "Travel", icon: "plane" },
  { id: "AIRPORT_LOUNGE", label: "Lounge", icon: "lounge" },
  { id: "MOVIES", label: "Movies", icon: "movie" },
  { id: "FITNESS", label: "Fitness", icon: "fitness" },
  { id: "SOFTWARE", label: "Software", icon: "code" },
  { id: "EDUCATION", label: "Education", icon: "school" },
  { id: "HOTEL", label: "Hotels", icon: "hotel" },
  { id: "CREDIT_CARD_BENEFITS", label: "Benefits", icon: "card" },
  { id: "OTHER", label: "More", icon: "grid" },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  tv: <path d="M4 7h16v11H4z M9 21h6 M12 18v3" />,
  music: <path d="M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />,
  bag: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0" />,
  food: <path d="M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z M6 1v3 M10 1v3 M14 1v3" />,
  pill: <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z M8.5 8.5l7 7" />,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  lounge: <path d="M4 18v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6 M6 18h12 M6 22h12 M8 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />,
  movie: <path d="m4 4 2 4h4L8 4 M14 4l2 4h4l-2-4 M4 8v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />,
  fitness: <path d="M6 5v14 M18 5v14 M6 12h12 M2 8v8 M22 8v8" />,
  code: <path d="m16 18 6-6-6-6 M8 6l-6 6 6 6" />,
  school: <path d="M22 10v6 M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5" />,
  hotel: <path d="M3 21h18 M5 21V7l7-4 7 4v14 M9 9h.01 M9 13h.01 M9 17h.01 M15 9h.01 M15 13h.01 M15 17h.01" />,
  card: <path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z M2 10h20 M6 15h4" />,
  grid: <path d="M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z" />,
};

function CategoryIcon({ name }: { name: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {ICONS[name] ?? ICONS.grid}
    </svg>
  );
}

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = session.userId;

  const [me] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const firstName = me?.name?.split(" ")[0] ?? "there";

  const myGroups = await db
    .select({ groupId: groups.id, groupName: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  if (myGroups.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-3 text-sm text-muted">
          SharePool is private. Create a group or join one with an invite code
          to start sharing subscriptions.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/groups/new"
            className="rounded-xl bg-gold px-4 py-3 text-sm font-bold text-[#1A1300] hover:bg-gold-dark"
          >
            Create a group
          </Link>
          <Link
            href="/groups/join"
            className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-ink hover:bg-card"
          >
            Join with invite code
          </Link>
        </div>
      </div>
    );
  }

  const { groupId, groupName } = myGroups[0];

  const memberRows = await db
    .select({ userId: groupMembers.userId, name: users.name })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .limit(6);

  const memberCountRow = await db
    .select({ c: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const memberCount = Number(memberCountRow[0]?.c ?? 0);

  const myMemberships = await db
    .select({
      id: memberships.id,
      name: memberships.name,
      category: memberships.category,
      provider: memberships.provider,
      status: memberships.status,
    })
    .from(memberships)
    .where(
      and(eq(memberships.groupId, groupId), eq(memberships.ownerId, userId))
    )
    .orderBy(desc(memberships.createdAt))
    .limit(6);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const expiringRaw = await db
    .select({
      id: memberships.id,
      name: memberships.name,
      provider: memberships.provider,
      renewalDate: memberships.renewalDate,
      expiryDate: memberships.expiryDate,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.groupId, groupId),
        eq(memberships.ownerId, session.userId),
        or(
          and(
            isNotNull(memberships.renewalDate),
            lte(memberships.renewalDate, sevenDaysFromNow)
          ),
          and(
            isNotNull(memberships.expiryDate),
            lte(memberships.expiryDate, sevenDaysFromNow)
          )
        )
      )
    )
    .orderBy(memberships.renewalDate)
    .limit(5);

  const expiringItems: ExpiringItem[] = expiringRaw.map((r) => ({
    id: r.id,
    name: r.name,
    provider: r.provider,
    renewalDate: r.renewalDate ? r.renewalDate.toISOString() : null,
    expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
    isOwner: true,
  }));

  return (
    <div className="space-y-10">
      {/* HERO */}
      <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr] md:items-end">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold">
            Your private sharing network
          </div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            <span className="font-semibold text-ink">
              Share what you already pay for.
            </span>{" "}
            Find subscriptions and services shared by people you trust.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold">Your trusted network</div>
              <div className="mt-1 text-2xl font-extrabold">
                {memberCount} {memberCount === 1 ? "person" : "people"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{groupName}</div>
            </div>
            <span className="text-2xl">🤝</span>
          </div>
          <div className="mt-3 flex">
            {memberRows.map((m, i) => (
              <div
                key={m.userId}
                className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-white/10 text-[11px] font-extrabold"
                style={{ marginLeft: i === 0 ? 0 : -8 }}
                title={m.name}
              >
                {initialsFor(m.name)}
              </div>
            ))}
            {memberCount > memberRows.length && (
              <div
                className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-white/10 text-[10px] font-extrabold"
                style={{ marginLeft: -8 }}
              >
                +{memberCount - memberRows.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <SearchBar />

      {/* CATEGORIES */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Browse by category
            </h2>
            <p className="mt-1 text-xs text-muted">
              Find a service that fits what you need.
            </p>
          </div>
          <Link
            href="/memberships"
            className="text-xs font-bold text-gold hover:underline"
          >
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-8">
          {CATEGORY_TILES.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse/${cat.id}`}
              className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold"
            >
              <span className="text-gold">
                <CategoryIcon name={cat.icon} />
              </span>
              <span className="text-[11px] font-bold leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* MY MEMBERSHIPS */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              🏠 My memberships
            </h2>
            <p className="mt-1 text-xs text-muted">
              Subscriptions you own and share.
            </p>
          </div>
          <Link
            href="/memberships/new"
            className="text-xs font-bold text-gold hover:underline"
          >
            + Add new
          </Link>
        </div>

        {myMemberships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">
              You haven&apos;t shared anything yet.
            </p>
            <Link
              href="/memberships/new"
              className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
            >
              Share your first subscription
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myMemberships.map((m) => {
              const isSharing =
                m.status === "AVAILABLE" || m.status === "IN_USE";
              return (
                <Link
                  key={m.id}
                  href={`/memberships/${m.id}`}
                  className="rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-gold/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-base font-extrabold text-gold">
                      {initialsFor(m.provider ?? m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-extrabold">
                        {m.provider ?? m.name}
                      </h3>
                      {m.provider && m.name !== m.provider && (
                        <div className="truncate text-[11px] font-medium text-ink/80">
                          {m.name}
                        </div>
                      )}
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        You own this ·{" "}
                        {m.category.replace(/_/g, " ").toLowerCase()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                        isSharing
                          ? "bg-teal-bg text-teal"
                          : "bg-white/5 text-muted"
                      }`}
                    >
                      {isSharing ? "Sharing" : "Off"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* EXPIRING SOON */}
      <ExpiringSoon items={expiringItems} />
    </div>
  );
}
