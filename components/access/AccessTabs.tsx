"use client";

import Link from "next/link";
import { useState } from "react";

type OwnedMembership = {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  status: string;
  maxUsers: number;
  activeCount: number;
};

type UsingAccess = {
  sessionId: string;
  membershipId: string;
  membershipName: string;
  provider: string | null;
  ownerName: string;
  endTime: string | null;
  units: number | null;
};

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function timeLabel(endTime: string | null, units: number | null) {
  if (units) return `${units} unit${units === 1 ? "" : "s"}`;
  if (!endTime) return "Active";
  const end = new Date(endTime);
  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return "Ended";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  return `until ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function AccessTabs({
  owned,
  using,
}: {
  owned: OwnedMembership[];
  using: UsingAccess[];
}) {
  const [tab, setTab] = useState<"owned" | "using">("owned");

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-full border border-border bg-card p-1.5">
        {[
          { key: "owned" as const, label: "Owned", count: owned.length },
          { key: "using" as const, label: "Using", count: using.length },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full px-3 py-2.5 text-xs font-bold transition-colors ${
              tab === t.key
                ? "bg-gold text-[#1A1300]"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${
                  tab === t.key ? "bg-black/20" : "bg-white/10"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "owned" && (
        <>
          {owned.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="text-4xl">🏠</div>
              <h3 className="mt-4 text-sm font-extrabold">
                You don&apos;t own anything yet
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
                Share a subscription you already pay for with your group.
              </p>
              <Link
                href="/memberships/new"
                className="mt-5 inline-block rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
              >
                List a subscription
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {owned.map((m) => {
                const isSharing =
                  m.status === "AVAILABLE" || m.status === "IN_USE";
                return (
                  <Link
                    key={m.id}
                    href={`/memberships/${m.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-gold/40"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-sm font-extrabold text-gold">
                      {initialsFor(m.provider ?? m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">
                        {m.provider ?? m.name}
                      </div>
                      {m.provider && m.name !== m.provider && (
                        <div className="truncate text-[11px] font-medium text-ink/80">
                          {m.name}
                        </div>
                      )}
                      <div className="mt-0.5 truncate text-[11px] text-muted">
                        You own this · {m.activeCount}/{m.maxUsers} members
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
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "using" && (
        <>
          {using.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="text-4xl">🔑</div>
              <h3 className="mt-4 text-sm font-extrabold">No active access</h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
                When someone approves your request, their subscription will
                show up here.
              </p>
              <Link
                href="/memberships"
                className="mt-5 inline-block rounded-xl bg-gold px-5 py-2.5 text-xs font-bold text-[#1A1300] hover:bg-gold-dark"
              >
                Browse subscriptions
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {using.map((s) => (
                <Link
                  key={s.sessionId}
                  href={`/memberships/${s.membershipId}`}
                  className="flex items-center gap-3 rounded-2xl border border-teal/25 bg-teal-bg/30 p-4 transition-colors hover:border-teal/50"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal/25 bg-teal/10 text-sm font-extrabold text-teal">
                    {initialsFor(s.provider ?? s.membershipName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {s.membershipName}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      from <span className="font-semibold text-ink">{s.ownerName}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-teal-bg px-2 py-1 text-[10px] font-bold text-teal">
                    {timeLabel(s.endTime, s.units)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
