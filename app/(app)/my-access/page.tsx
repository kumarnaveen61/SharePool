import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  accessSessions,
  memberships,
  users,
  membershipCredentials,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { RevealCredential } from "@/components/credentials/RevealCredential";

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default async function MyAccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      session: accessSessions,
      membership: memberships,
      ownerName: users.name,
    })
    .from(accessSessions)
    .innerJoin(memberships, eq(accessSessions.membershipId, memberships.id))
    .innerJoin(users, eq(accessSessions.ownerId, users.id))
    .where(
      and(
        eq(accessSessions.requesterId, session.userId),
        eq(accessSessions.status, "ACTIVE")
      )
    )
    .orderBy(desc(accessSessions.approvedAt));

  // Which memberships have credentials configured?
  const membershipIds = rows.map((r) => r.membership.id);
  const credCounts = membershipIds.length
    ? await db
        .select({
          membershipId: membershipCredentials.membershipId,
        })
        .from(membershipCredentials)
        .where(eq(membershipCredentials.membershipId, membershipIds[0]))
    : [];

  // Simpler: just fetch all credentials for these membership ids
  const credentials = membershipIds.length
    ? await db
        .select({ membershipId: membershipCredentials.membershipId })
        .from(membershipCredentials)
    : [];
  const hasCred = new Set(
    credentials
      .filter((c) => membershipIds.includes(c.membershipId))
      .map((c) => c.membershipId)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">My access</h1>
        <p className="mt-2 text-sm text-muted">
          Subscriptions you currently have access to.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="text-5xl">🔑</div>
          <h2 className="mt-5 text-lg font-extrabold tracking-tight">
            No active access yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            When someone approves your request, the access details will show
            up here.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
          >
            Browse subscriptions
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map(({ session: s, membership: m, ownerName }) => (
            <div key={s.id} className="space-y-3">
              {/* Membership header */}
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-white/5 text-xs font-extrabold text-gold">
                  {initialsFor(m.provider ?? m.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/memberships/${m.id}`}
                    className="block truncate text-sm font-extrabold hover:text-gold"
                  >
                    {m.name}
                  </Link>
                  <div className="mt-0.5 truncate text-[11px] text-muted">
                    from {ownerName}
                    {s.endTime && (
                      <>
                        {" · "}
                        until{" "}
                        {new Date(s.endTime).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-teal-bg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal">
                  Active
                </span>
              </div>

              {/* Reveal panel */}
              {hasCred.has(m.id) ? (
                <RevealCredential membershipId={m.id} />
              ) : (
                <div className="rounded-3xl border border-border bg-card p-6">
                  <p className="text-xs leading-relaxed text-muted">
                    The owner hasn&apos;t set up access details for this yet.
                    Ping them directly.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}