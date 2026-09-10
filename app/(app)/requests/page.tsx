"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api-client";

type AccessRequest = {
  id: string;
  status: string;
  membershipName: string;
  requesterName: string;
  ownerName: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  requestedUnits: number | null;
  reason: string | null;
  createdAt: string;
};

type AccessSession = {
  id: string;
  status: string;
  membershipName: string;
  ownerName: string;
  requesterName: string;
  startTime: string | null;
  endTime: string | null;
  units: number | null;
  rating: { id: string; stars: number; feedback: string | null } | null;
};

const statusColor: Record<string, string> = {
  PENDING: "bg-accent/10 text-accent-dark",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  CANCELLED: "bg-background text-muted",
  ACTIVE: "bg-brand/10 text-brand",
  COMPLETED: "bg-success/10 text-success",
  EXPIRED: "bg-background text-muted",
};

function RateForm({
  sessionId,
  onRated,
}: {
  sessionId: string;
  onRated: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/access-sessions/${sessionId}/rate`, {
        method: "POST",
        body: JSON.stringify({ stars, feedback: feedback || undefined }),
      });
      onRated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium text-ink">Rate this experience</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-lg ${n <= stars ? "text-accent" : "text-border"}`}
            type="button"
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional feedback"
        rows={2}
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <Button onClick={submit} loading={saving} className="mt-2 w-full text-xs">
        Submit rating
      </Button>
    </div>
  );
}

export default function RequestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"incoming" | "outgoing" | "history">(
    "incoming"
  );
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [sessions, setSessions] = useState<AccessSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      if (tab === "history") {
        const { sessions } = await apiFetch<{ sessions: AccessSession[] }>(
          `/api/access-sessions?direction=outgoing`
        );
        setSessions(sessions.filter((s) => s.status === "COMPLETED" || s.status === "EXPIRED"));
      } else {
        const { requests } = await apiFetch<{ requests: AccessRequest[] }>(
          `/api/access-requests?direction=${tab}`
        );
        setRequests(requests);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function act(id: string, action: "approve" | "reject" | "cancel") {
    setBusyId(id);
    try {
      await apiFetch(`/api/access-requests/${id}/${action}`, { method: "POST" });
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Requests</h1>

      <div className="mt-4 flex gap-2">
        {(["incoming", "outgoing", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t
                ? "bg-brand text-white"
                : "bg-surface text-muted border border-border"
            }`}
          >
            {t === "incoming" ? "Incoming" : t === "outgoing" ? "My requests" : "History"}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {tab !== "history" && requests.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          {tab === "incoming"
            ? "No one has requested any of your memberships yet."
            : "You haven't requested anything yet."}
        </div>
      )}

      {tab !== "history" && requests.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{r.membershipName}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {tab === "incoming"
                      ? `Requested by ${r.requesterName}`
                      : `Owned by ${r.ownerName}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[r.status]}`}>
                  {r.status}
                </span>
              </div>

              <div className="mt-2 text-xs text-muted">
                {r.requestedUnits
                  ? `${r.requestedUnits} unit(s)`
                  : r.requestedStartTime && r.requestedEndTime
                  ? `${new Date(r.requestedStartTime).toLocaleString()} → ${new Date(r.requestedEndTime).toLocaleString()}`
                  : null}
              </div>
              {r.reason && <p className="mt-2 text-sm text-ink">&ldquo;{r.reason}&rdquo;</p>}

              {tab === "incoming" && r.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => act(r.id, "approve")} loading={busyId === r.id} className="flex-1">
                    Approve
                  </Button>
                  <Button variant="secondary" onClick={() => act(r.id, "reject")} loading={busyId === r.id} className="flex-1">
                    Reject
                  </Button>
                </div>
              )}

              {tab === "outgoing" && r.status === "PENDING" && (
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => act(r.id, "cancel")} loading={busyId === r.id} className="w-full">
                    Cancel request
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "history" && sessions.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
          Nothing finished yet — once a session you used wraps up, you can rate it here.
        </div>
      )}

      {tab === "history" && sessions.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{s.membershipName}</p>
                  <p className="mt-0.5 text-xs text-muted">Owned by {s.ownerName}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[s.status]}`}>
                  {s.status}
                </span>
              </div>

              {s.rating ? (
                <p className="mt-2 text-xs text-muted">
                  You rated this {"★".repeat(s.rating.stars)}
                  {s.rating.feedback ? ` — "${s.rating.feedback}"` : ""}
                </p>
              ) : (
                <RateForm sessionId={s.id} onRated={load} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
