"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

export function ProviderReviewActions({
  id,
  suggestedName,
}: {
  id: string;
  suggestedName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState("");

  async function handle(action: "APPROVE" | "REJECT", adminNotes?: string) {
    setBusy(action);
    setError(null);
    try {
      await apiFetch(`/api/platform/providers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNotes }),
      });
      setRejectOpen(false);
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => handle("APPROVE")}
          disabled={busy !== null}
          className="rounded-xl bg-teal px-4 py-2 text-xs font-extrabold text-[#052620] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === "APPROVE" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={busy !== null}
          className="rounded-xl border border-red/30 px-4 py-2 text-xs font-extrabold text-red transition-colors hover:bg-red-bg disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-[11px] font-semibold text-red">
          {error}
        </p>
      )}

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => busy === null && setRejectOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-red/30 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold">Reject suggestion?</h2>
            <p className="mt-1 text-xs text-muted">
              &ldquo;{suggestedName}&rdquo; will not be added to the catalog.
            </p>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">
                Reason (optional, shown to the user)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Already covered by another provider"
                className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-red/60"
              />
            </label>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                disabled={busy !== null}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handle("REJECT", notes || undefined)}
                disabled={busy !== null}
                className="flex-1 rounded-xl bg-red py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy === "REJECT" ? "Rejecting…" : "Yes, reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
