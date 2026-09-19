"use client";

import { ApprovedMembers, type ActiveMember } from "@/components/membership/ApprovedMembers";
import { CredentialForm } from "@/components/credentials/CredentialForm";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

type Membership = {
  id: string;
  publicId: string | null;
  groupId: string;
  name: string;
  category: string;
  provider: string | null;
  planName: string | null;
  description: string | null;
  status: string;
  sharingEligibility: string;
  remainingUnits: number | null;
  totalUnits: number | null;
};
type Availability = {
  id: string;
  startTime: string;
  endTime: string;
};

type AccessRequest = {
  id: string;
  status: string;
  requesterId: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  requestedUnits: number | null;
  reason: string | null;
};

const eligibilityCopy: Record<string, { label: string; note: string }> = {
  OFFICIALLY_SHAREABLE: {
    label: "Officially shareable",
    note: "The provider explicitly allows sharing this (e.g. a family plan).",
  },
  OWNER_ASSISTED: {
    label: "Owner-assisted",
    note: "The owner performs the action on the requester's behalf.",
  },
  TRANSFERABLE_BENEFIT: {
    label: "Transferable benefit",
    note: "A voucher or credit that can be handed to another member.",
  },
  NOT_SHAREABLE: {
    label: "Not shareable",
    note: "Tracked here for reference only — this can never be offered to the group.",
  },
};

const statusLabel: Record<string, string> = {
  AVAILABLE: "Available now",
  IN_USE: "In use",
  UNAVAILABLE: "Not offered",
  SCHEDULED: "Scheduled",
  PENDING_APPROVAL: "Pending",
};

/* ── iOS-style toggle ── */
function IOSToggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-gold" : "bg-white/15"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/* ── Selectable chip ── */
function Chip({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
        selected
          ? "border-gold bg-gold/10 text-gold"
          : "border-border bg-white/[0.03] text-muted hover:border-white/20 hover:text-ink"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}

type DurationKey = "1hr" | "2hrs" | "3hrs" | "4hrs";
type WindowKey = "today" | "this_week" | "until_off";

const DURATIONS: { key: DurationKey; label: string; hours: number }[] = [
  { key: "1hr", label: "1 hr", hours: 1 },
  { key: "2hrs", label: "2 hrs", hours: 2 },
  { key: "3hrs", label: "3 hrs", hours: 3 },
  { key: "4hrs", label: "4 hrs", hours: 4 },
];

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
  { key: "until_off", label: "Until I turn it off" },
];

/** Compute { startTime, endTime } from chips. */
function computeWindow(duration: DurationKey, window: WindowKey) {
  const start = new Date();
  let end = new Date(start);

  const hours = DURATIONS.find((d) => d.key === duration)?.hours ?? 1;
  end.setHours(end.getHours() + hours);

  if (window === "this_week") {
    const dayOfWeek = start.getDay(); // 0 = Sun
    const daysUntilSunday = 7 - dayOfWeek;
    end = new Date(start);
    end.setDate(end.getDate() + daysUntilSunday);
    end.setHours(23, 59, 59, 0);
  } else if (window === "until_off") {
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 10);
  }

  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function formatRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const optsWithYear: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString(
    "en-US",
    optsWithYear
  )}`;
}

export default function MembershipDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    membership: Membership;
    ownerName: string;
    isOwner: boolean;
    isCallerAdmin: boolean;
    upcomingAvailability: Availability[];
    pendingRequests: AccessRequest[];
    myPendingRequest: AccessRequest | null;
    activeMembers: ActiveMember[];
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Chips
  const [duration, setDuration] = useState<DurationKey>("1hr");
  const [windowKey, setWindowKey] = useState<WindowKey>("today");
  const [toggleBusy, setToggleBusy] = useState(false);

  // Non-owner request access
  const [reqReason, setReqReason] = useState("");
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqSaving, setReqSaving] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Report / remove
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const router = useRouter();

  async function load() {
    try {
      const result = await apiFetch<typeof data>(
        `/api/memberships/${params.id}`
      );
      setData(result);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Could not load membership."
      );
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleToggle(next: boolean) {
    if (!data) return;
    setToggleBusy(true);
    setLoadError(null);
    try {
      if (next) {
        // Turn ON → save an availability window computed from chips
        const { startTime, endTime } = computeWindow(duration, windowKey);
        await apiFetch(`/api/memberships/${params.id}/availability`, {
          method: "POST",
          body: JSON.stringify({ startTime, endTime }),
        });
      } else {
        // Turn OFF → flip status to UNAVAILABLE
        await apiFetch(`/api/memberships/${params.id}/toggle-availability`, {
          method: "POST",
        });
      }
      await load();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setToggleBusy(false);
    }
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setReqError(null);
    setReqSuccess(false);
    setReqSaving(true);
    try {
      const { startTime, endTime } = computeWindow(duration, windowKey);
      await apiFetch("/api/access-requests", {
        method: "POST",
        body: JSON.stringify({
          membershipId: params.id,
          requestedStartTime: startTime,
          requestedEndTime: endTime,
          requestedUnits: data.membership.remainingUnits !== null ? 1 : undefined,
          reason: reqReason || undefined,
        }),
      });
      setReqSuccess(true);
      await load();
    } catch (err) {
      setReqError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setReqSaving(false);
    }
  }

  async function handleDecision(
    requestId: string,
    action: "approve" | "reject"
  ) {
    setActionBusyId(requestId);
    try {
      await apiFetch(`/api/access-requests/${requestId}/${action}`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setActionBusyId(null);
    }
  }

  async function submitReport() {
    if (!data) return;
    setReportBusy(true);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          groupId: data.membership.groupId,
          targetType: "MEMBERSHIP",
          targetMembershipId: params.id,
          reason: reportReason,
        }),
      });
      setReportSent(true);
      setShowReport(false);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setReportBusy(false);
    }
  }

  async function handleRemoveMembership() {
    setRemoveBusy(true);
    try {
      await apiFetch(`/api/memberships/${params.id}/remove`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/groups/${data!.membership.groupId}`);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setRemoveBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="rounded-xl border border-red/30 bg-red-bg px-4 py-3 text-sm text-red">
          {loadError}
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-1/2 rounded-lg bg-white/5" />
          <div className="h-4 w-1/3 rounded bg-white/5" />
          <div className="h-64 rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  const {
    membership,
    ownerName,
    isOwner,
    upcomingAvailability,
    pendingRequests,
    myPendingRequest,
  } = data;
  const elig = eligibilityCopy[membership.sharingEligibility];
  const isAvailable = membership.status === "AVAILABLE";
  const previous = upcomingAvailability[0];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* ── Main card ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold tracking-tight">
                {membership.name}
              </h1>
                {membership.publicId && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-muted">
                  {membership.publicId}
                </div>
              )}
              <p className="mt-1 text-xs text-muted">
                {membership.planName ? `${membership.planName}, ` : ""}
                owned by {isOwner ? "you" : ownerName}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                isAvailable
                  ? "bg-teal-bg text-teal"
                  : membership.status === "IN_USE"
                    ? "bg-amber-bg text-gold"
                    : "bg-white/5 text-muted"
              }`}
            >
              {statusLabel[membership.status] ?? membership.status}
            </span>
          </div>

          {membership.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {membership.description}
            </p>
          )}
        </div>

        {/* Eligibility */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                membership.sharingEligibility === "OFFICIALLY_SHAREABLE"
                  ? "bg-teal"
                  : membership.sharingEligibility === "NOT_SHAREABLE"
                    ? "bg-red"
                    : "bg-gold"
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold">{elig.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {elig.note}
              </p>
            </div>
          </div>
        </div>

        {/* Owner: "Offer this to the group" + chips */}
{isOwner && membership.sharingEligibility !== "NOT_SHAREABLE" && (
  <>
            <div className="flex items-center justify-between border-t border-border px-6 py-5">
              <span className="text-sm font-extrabold">
                Offer this to the group
              </span>
              <IOSToggle
                on={isAvailable}
                onChange={handleToggle}
                disabled={toggleBusy}
              />
            </div>

            <div
              className={`space-y-3 border-t border-border px-6 py-5 transition-opacity ${
                isAvailable ? "opacity-100" : "opacity-50"
              }`}
            >
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Available for
                </div>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d.key}
                      label={d.label}
                      selected={duration === d.key}
                      onClick={() => setDuration(d.key)}
                      disabled={!isAvailable}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {WINDOWS.map((w) => (
                  <Chip
                    key={w.key}
                    label={w.label}
                    selected={windowKey === w.key}
                    onClick={() => setWindowKey(w.key)}
                    disabled={!isAvailable}
                  />
                ))}
              </div>
            </div>

            {previous && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Available previously
                </span>
                <span className="text-xs font-semibold text-muted">
                  {formatRange(previous.startTime, previous.endTime)}
                </span>
              </div>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemoveMembership}
              disabled={removeBusy}
              className="w-full border-t border-border py-4 text-sm font-bold text-red transition-colors hover:bg-red-bg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removeBusy ? "Removing…" : "Remove membership"}
            </button>
          </>
        )}
        {isOwner && membership.sharingEligibility !== "NOT_SHAREABLE" && (
          <CredentialForm membershipId={membership.id} />
        )}
        {isOwner && membership.sharingEligibility === "NOT_SHAREABLE" && (
          <div className="border-t border-border px-6 py-5">
            <p className="text-xs leading-relaxed text-muted">
              This membership is marked <strong>Not Shareable</strong>, so it
              can&apos;t be offered to the group. It&apos;s here for your own
              tracking only.
            </p>
            <button
              type="button"
              onClick={handleRemoveMembership}
              disabled={removeBusy}
              className="mt-4 w-full rounded-xl border border-red/30 py-3 text-xs font-bold text-red transition-colors hover:bg-red-bg disabled:opacity-60"
            >
              {removeBusy ? "Removing…" : "Remove membership"}
            </button>
          </div>
        )}
      </div>

      {/* ── Non-owner: pending banner ─────────────────────── */}
      {!isOwner && myPendingRequest && (
        <div className="rounded-2xl border border-gold/25 bg-amber-bg px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg">⏳</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Request pending</div>
              <div className="mt-0.5 text-xs text-muted">
                Waiting for {ownerName} to approve.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Non-owner: request access form ───────────────── */}
      {!isOwner &&
        membership.sharingEligibility !== "NOT_SHAREABLE" &&
        !myPendingRequest &&
        membership.status === "AVAILABLE" && (
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-sm font-extrabold">Request access</h2>
            <p className="mt-1 text-xs text-muted">
              Pick how long you need it, and send a request.
            </p>

            <form onSubmit={handleRequestAccess} className="mt-5 space-y-4">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  I need it for
                </div>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d.key}
                      label={d.label}
                      selected={duration === d.key}
                      onClick={() => setDuration(d.key)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {WINDOWS.map((w) => (
                  <Chip
                    key={w.key}
                    label={w.label}
                    selected={windowKey === w.key}
                    onClick={() => setWindowKey(w.key)}
                  />
                ))}
              </div>

              <Field label="Reason (optional)">
                <Textarea
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="Let them know why"
                />
              </Field>

              {reqError && (
                <p className="text-xs text-red">{reqError}</p>
              )}
              {reqSuccess && (
                <p className="text-xs text-teal">
                  ✓ Request sent to {ownerName}
                </p>
              )}

              <button
                type="submit"
                disabled={reqSaving}
                className="w-full rounded-xl bg-gold py-3 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:opacity-60"
              >
                {reqSaving ? "Sending…" : `Request access`}
              </button>
            </form>
          </div>
        )}

      {!isOwner &&
        membership.sharingEligibility !== "NOT_SHAREABLE" &&
        membership.status !== "AVAILABLE" &&
        !myPendingRequest && (
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-sm text-muted">
              This isn&apos;t currently available to request.
            </p>
          </div>
        )}

      {/* ── Owner: pending requests ───────────────────────── */}
      {isOwner && pendingRequests.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold">
              Pending requests
            </h2>
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold text-gold">
              {pendingRequests.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {pendingRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-white/[0.02] p-4"
              >
                {r.reason && (
                  <p className="text-sm leading-relaxed text-ink">
                    &ldquo;{r.reason}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-[11px] text-muted">
                  {r.requestedUnits
                    ? `${r.requestedUnits} unit(s)`
                    : r.requestedStartTime && r.requestedEndTime
                      ? formatRange(
                          r.requestedStartTime,
                          r.requestedEndTime
                        )
                      : "No window specified"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(r.id, "approve")}
                    disabled={actionBusyId === r.id}
                    className="flex-1 rounded-xl bg-teal py-2.5 text-xs font-extrabold text-[#052620] transition-colors hover:opacity-90 disabled:opacity-60"
                  >
                    {actionBusyId === r.id ? "…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(r.id, "reject")}
                    disabled={actionBusyId === r.id}
                    className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold text-ink transition-colors hover:bg-white/5 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Owner: Approved members ───────────────────────── */}
      {isOwner && (
        <ApprovedMembers
          members={data.activeMembers ?? []}
          membershipName={membership.name}
          onChanged={load}
        />
      )}

      {/* ── Report (non-owner) ───────────────────────────── */}
      {!isOwner && !reportSent && (
        <div className="text-center">
          {!showReport ? (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Report this membership
            </button>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 text-left">
              <Textarea
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="What's wrong with this listing?"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={reportBusy}
                  className="flex-1 rounded-xl bg-gold py-2.5 text-xs font-extrabold text-[#1A1300] disabled:opacity-60"
                >
                  {reportBusy ? "Submitting…" : "Submit report"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {reportSent && (
        <div className="rounded-2xl border border-teal/25 bg-teal-bg px-5 py-3 text-center">
          <p className="text-xs font-bold text-teal">
            ✓ Report submitted to group admins
          </p>
        </div>
      )}
    </div>
  );
}