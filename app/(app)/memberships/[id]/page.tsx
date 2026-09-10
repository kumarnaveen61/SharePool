"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

type Membership = {
  id: string;
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
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Owner: set availability
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Non-owner: request access
  const [reqStart, setReqStart] = useState("");
  const [reqEnd, setReqEnd] = useState("");
  const [reqUnits, setReqUnits] = useState("1");
  const [reqReason, setReqReason] = useState("");
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqSaving, setReqSaving] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Report / remove membership
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

  async function handleSetAvailability(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await apiFetch(`/api/memberships/${params.id}/availability`, {
        method: "POST",
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });
      setSuccess(true);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setReqError(null);
    setReqSuccess(false);
    setReqSaving(true);
    try {
      const isQuantityBased = data!.membership.remainingUnits !== null;
      await apiFetch("/api/access-requests", {
        method: "POST",
        body: JSON.stringify({
          membershipId: params.id,
          ...(isQuantityBased
            ? { requestedUnits: Number(reqUnits) }
            : {
                requestedStartTime: new Date(reqStart).toISOString(),
                requestedEndTime: new Date(reqEnd).toISOString(),
              }),
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
    setReportBusy(true);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          groupId: data!.membership.groupId,
          targetType: "MEMBERSHIP",
          targetMembershipId: params.id,
          reason: reportReason,
        }),
      });
      setReportSent(true);
      setShowReport(false);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setLoadError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setRemoveBusy(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-danger">{loadError}</p>;
  }
  if (!data) {
    return <p className="text-sm text-muted">Loading…</p>;
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
  const isQuantityBased = membership.remainingUnits !== null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">{membership.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {membership.planName ? `${membership.planName} · ` : ""}
        Owned by {ownerName}
        {isOwner ? " (you)" : ""}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            membership.status === "AVAILABLE"
              ? "bg-success/10 text-success"
              : "bg-background text-muted"
          }`}
        >
          {statusLabel[membership.status] ?? membership.status}
        </span>
        {isQuantityBased && (
          <span className="text-xs text-muted">
            {membership.remainingUnits} of {membership.totalUnits} remaining
          </span>
        )}
      </div>

      {membership.description && (
        <p className="mt-4 rounded-xl border border-border bg-surface p-3.5 text-sm text-ink">
          {membership.description}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-border bg-surface p-3.5">
        <p className="text-sm font-medium text-ink">{elig.label}</p>
        <p className="mt-0.5 text-xs text-muted">{elig.note}</p>
      </div>

      {/* Owner: pending requests to decide on */}
      {isOwner && pendingRequests.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted">
            Pending requests ({pendingRequests.length})
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {pendingRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-surface p-3.5"
              >
                {r.reason && (
                  <p className="text-sm text-ink">&ldquo;{r.reason}&rdquo;</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {r.requestedUnits
                    ? `${r.requestedUnits} unit(s)`
                    : r.requestedStartTime && r.requestedEndTime
                    ? `${new Date(r.requestedStartTime).toLocaleString()} → ${new Date(r.requestedEndTime).toLocaleString()}`
                    : null}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={() => handleDecision(r.id, "approve")}
                    loading={actionBusyId === r.id}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDecision(r.id, "reject")}
                    loading={actionBusyId === r.id}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner: set availability */}
      {isOwner && membership.sharingEligibility !== "NOT_SHAREABLE" && (
        <form
          onSubmit={handleSetAvailability}
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <h2 className="text-sm font-medium text-ink">
            Offer this to the group
          </h2>
          <Field label="Available from">
            <Input
              required
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="Available until">
            <Input
              required
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          {success && (
            <p className="text-sm text-success">
              This membership is now marked available.
            </p>
          )}
          <Button type="submit" loading={saving}>
            Mark available for this window
          </Button>
        </form>
      )}

      {isOwner && membership.sharingEligibility === "NOT_SHAREABLE" && (
        <p className="mt-6 text-sm text-muted">
          This membership is marked Not Shareable, so it can&apos;t be offered
          to the group. It&apos;s here for your own tracking only.
        </p>
      )}

      {/* Non-owner: request access */}
      {!isOwner && membership.sharingEligibility === "NOT_SHAREABLE" && (
        <p className="mt-6 text-sm text-muted">
          This is marked Not Shareable and can&apos;t be requested.
        </p>
      )}

      {!isOwner &&
        membership.sharingEligibility !== "NOT_SHAREABLE" &&
        myPendingRequest && (
          <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm text-ink">
            Your request is pending {ownerName}&apos;s approval.
          </div>
        )}

      {!isOwner &&
        membership.sharingEligibility !== "NOT_SHAREABLE" &&
        !myPendingRequest &&
        membership.status === "AVAILABLE" && (
          <form
            onSubmit={handleRequestAccess}
            className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <h2 className="text-sm font-medium text-ink">Request access</h2>

            {isQuantityBased ? (
              <Field label={`Units (up to ${membership.remainingUnits})`}>
                <Input
                  required
                  type="number"
                  min={1}
                  max={membership.remainingUnits ?? 1}
                  value={reqUnits}
                  onChange={(e) => setReqUnits(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="From">
                  <Input
                    required
                    type="datetime-local"
                    value={reqStart}
                    onChange={(e) => setReqStart(e.target.value)}
                  />
                </Field>
                <Field label="Until">
                  <Input
                    required
                    type="datetime-local"
                    value={reqEnd}
                    onChange={(e) => setReqEnd(e.target.value)}
                  />
                </Field>
              </>
            )}

            <Field label="Reason (optional)">
              <Textarea
                rows={2}
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                placeholder="Let them know why"
              />
            </Field>

            {reqError && <p className="text-sm text-danger">{reqError}</p>}
            {reqSuccess && (
              <p className="text-sm text-success">Request sent.</p>
            )}

            <Button type="submit" loading={reqSaving}>
              Send request
            </Button>
          </form>
        )}

      {!isOwner &&
        membership.sharingEligibility !== "NOT_SHAREABLE" &&
        membership.status !== "AVAILABLE" &&
        !myPendingRequest && (
          <p className="mt-6 text-sm text-muted">
            This isn&apos;t currently available to request.
          </p>
        )}

      {upcomingAvailability.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted">Availability history</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {upcomingAvailability.map((a) => (
              <li key={a.id} className="text-xs text-muted">
                {new Date(a.startTime).toLocaleString()} →{" "}
                {new Date(a.endTime).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportSent && (
        <p className="mt-6 text-sm text-success">Report submitted to group admins.</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {!isOwner && !showReport && !reportSent && (
          <Button variant="ghost" onClick={() => setShowReport(true)}>
            Report this membership
          </Button>
        )}
        {showReport && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <Textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What's wrong with this listing?"
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={submitReport} loading={reportBusy} className="flex-1">
                Submit report
              </Button>
              <Button variant="secondary" onClick={() => setShowReport(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {(isOwner || data.isCallerAdmin) && (
          <Button variant="danger" onClick={handleRemoveMembership} loading={removeBusy}>
            Remove this membership
          </Button>
        )}
      </div>
    </div>
  );
}
