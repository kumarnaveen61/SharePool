"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type IncomingRequest = {
  id: string;
  status: string;
  membershipId: string;
  membershipName: string;
  requesterName: string;
  reason: string | null;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  createdAt: string;
};

type OutgoingRequest = {
  id: string;
  status: string;
  membershipId: string;
  membershipName: string;
  ownerName: string;
  createdAt: string;
};

type HistoryRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
  actorName: string | null;
};

type Props = {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
  history: HistoryRow[];
  currentUserId: string;
};

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (s && e) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  return s ? `from ${s.toLocaleDateString()}` : e ? `until ${e.toLocaleDateString()}` : null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-bg text-gold",
  APPROVED: "bg-teal-bg text-teal",
  REJECTED: "bg-red-bg text-red",
  CANCELLED: "bg-white/5 text-muted",
};

export function ActivityTabs({
  incoming,
  outgoing,
  history,
  currentUserId,
}: Props) {
  const [tab, setTab] = useState<"incoming" | "outgoing" | "history">(
    "incoming"
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localIncoming, setLocalIncoming] = useState(incoming);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await apiFetch(`/api/access-requests/${id}/${action}`, {
        method: "POST",
      });
      setLocalIncoming((p) => p.filter((r) => r.id !== id));
    } catch {
      // ignore
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/access-requests/${id}/cancel`, { method: "POST" });
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setBusyId(null);
    }
  }

  const pendingIncoming = localIncoming.filter((r) => r.status === "PENDING");

  return (
    <div>
      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 rounded-full border border-border bg-card p-1.5">
        {[
          { key: "incoming" as const, label: "Incoming" },
          { key: "outgoing" as const, label: "My requests" },
          { key: "history" as const, label: "History" },
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
          </button>
        ))}
      </div>

      {/* Incoming */}
      {tab === "incoming" && (
        <>
          {pendingIncoming.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="text-4xl">📥</div>
              <h3 className="mt-4 text-sm font-extrabold">
                No pending requests
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
                When someone requests access to your subscriptions, it will
                show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingIncoming.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-xs font-extrabold">
                      {r.requesterName
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{r.requesterName}</div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        wants <span className="font-semibold text-ink">{r.membershipName}</span>
                      </div>
                      {r.reason && (
                        <p className="mt-2 text-xs italic text-muted">
                          &ldquo;{r.reason}&rdquo;
                        </p>
                      )}
                      {formatRange(r.requestedStartTime, r.requestedEndTime) && (
                        <div className="mt-2 text-[11px] text-muted">
                          {formatRange(r.requestedStartTime, r.requestedEndTime)}
                        </div>
                      )}
                      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                        {timeAgo(r.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                        STATUS_STYLES[r.status] ?? "bg-white/5 text-muted"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(r.id, "approve")}
                      disabled={busyId === r.id}
                      className="flex-1 rounded-xl bg-teal py-2.5 text-xs font-extrabold text-[#052620] transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {busyId === r.id ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold text-ink hover:bg-white/5 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Outgoing */}
      {tab === "outgoing" && (
        <>
          {outgoing.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="text-4xl">📤</div>
              <h3 className="mt-4 text-sm font-extrabold">
                No requests yet
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
                Browse subscriptions and request access — your requests will
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
              {outgoing.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {r.membershipName}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      from {r.ownerName} · {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                      STATUS_STYLES[r.status] ?? "bg-white/5 text-muted"
                    }`}
                  >
                    {r.status}
                  </span>
                  {r.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => cancel(r.id)}
                      disabled={busyId === r.id}
                      className="shrink-0 rounded-lg border border-red/30 px-2.5 py-1.5 text-[10px] font-bold text-red hover:bg-red-bg disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* History */}
      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <div className="text-4xl">📜</div>
              <h3 className="mt-4 text-sm font-extrabold">No history yet</h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
                Your group&apos;s activity will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {history.map((h) => {
                let meta: any = null;
                try {
                  meta = h.metadata ? JSON.parse(h.metadata) : null;
                } catch {
                  meta = null;
                }
                const actor = h.actorName ?? "Someone";
                const verbMap: Record<string, string> = {
                  MEMBERSHIP_CREATED: `${actor} listed ${meta?.name ?? "a subscription"}`,
                  ACCESS_REQUESTED: `${actor} requested ${meta?.membershipName ?? "access"}`,
                  ACCESS_APPROVED: `${actor} approved a request for ${meta?.membershipName ?? "a subscription"}`,
                  ACCESS_REJECTED: `${actor} rejected a request`,
                  ACCESS_REVOKED: `${actor} revoked access to ${meta?.membershipName ?? "a subscription"}`,
                };
                const text = verbMap[h.action] ?? `${actor} did something`;
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-sm">
                      •
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{text}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {timeAgo(h.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
