"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

type Profile = {
  user: { id: string; name: string; avatarUrl: string | null };
  isSelf: boolean;
  poolCredits: number;
  membershipsContributed: number;
  benefitsShared: number;
  benefitsUsed: number;
  successfulRequests: number;
  cancelledRequests: number;
  trustScore: number | null;
  ratingCount: number;
  isCallerAdmin: boolean;
  targetRole: string;
  targetSuspended: boolean;
  isBlockedByMe: boolean;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 text-center">
      <p className="text-xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string; userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  function load() {
    apiFetch<Profile>(`/api/groups/${params.id}/members/${params.userId}`)
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load profile.")
      );
  }

  useEffect(load, [params.id, params.userId]);

  async function act(action: "suspend" | "unsuspend" | "remove") {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/groups/${params.id}/members/${params.userId}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (action === "remove") {
        router.push(`/groups/${params.id}`);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      if (profile.isBlockedByMe) {
        await apiFetch(`/api/groups/${params.id}/blocks/${params.userId}`, { method: "POST" });
      } else {
        await apiFetch(`/api/groups/${params.id}/blocks`, {
          method: "POST",
          body: JSON.stringify({ userId: params.userId }),
        });
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          groupId: params.id,
          targetType: "USER",
          targetUserId: params.userId,
          reason: reportReason,
        }),
      });
      setReportSent(true);
      setShowReport(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !profile) return <p className="text-sm text-danger">{error}</p>;
  if (!profile) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-lg font-semibold text-brand">
          {profile.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {profile.user.name}
            {profile.isSelf ? " (you)" : ""}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {profile.trustScore !== null
              ? `⭐ ${profile.trustScore.toFixed(1)} (${profile.ratingCount} rating${profile.ratingCount !== 1 ? "s" : ""})`
              : "No ratings yet"}
            {profile.targetSuspended && (
              <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                Suspended
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <StatCard label="Pool Credits" value={profile.poolCredits} />
        <StatCard label="Memberships" value={profile.membershipsContributed} />
        <StatCard label="Shares" value={profile.benefitsShared} />
        <StatCard label="Uses" value={profile.benefitsUsed} />
        <StatCard label="Successful requests" value={profile.successfulRequests} />
        <StatCard label="Cancelled requests" value={profile.cancelledRequests} />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {reportSent && <p className="mt-4 text-sm text-success">Report submitted to group admins.</p>}

      {!profile.isSelf && (
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={toggleBlock}
            loading={busy}
          >
            {profile.isBlockedByMe ? "Unblock this member" : "Block this member"}
          </Button>

          {!showReport ? (
            <Button variant="ghost" onClick={() => setShowReport(true)}>
              Report this member
            </Button>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-3">
              <Textarea
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="What happened?"
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={submitReport} loading={busy} className="flex-1">
                  Submit report
                </Button>
                <Button variant="secondary" onClick={() => setShowReport(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!profile.isSelf && profile.isCallerAdmin && profile.targetRole !== "OWNER" && (
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-medium text-ink">Admin actions</p>
          <div className="mt-2 flex flex-col gap-2">
            {profile.targetSuspended ? (
              <Button variant="secondary" onClick={() => act("unsuspend")} loading={busy}>
                Unsuspend
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => act("suspend")} loading={busy}>
                Suspend
              </Button>
            )}
            <Button variant="danger" onClick={() => act("remove")} loading={busy}>
              Remove from group
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
