"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

type Props = {
  sessionId: string;
  memberName: string;
  membershipName: string;
  onClose: () => void;
  onRevoked: () => void;
};

export function RevokeMemberModal({
  sessionId,
  memberName,
  membershipName,
  onClose,
  onRevoked,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/access-sessions/${sessionId}/revoke`, {
        method: "POST",
      });
      onRevoked();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-red/30 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-bg text-xl">
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-extrabold">Revoke access?</h2>
            <p className="mt-0.5 text-xs text-muted">
              This takes effect immediately.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-red/20 bg-red-bg/50 p-4">
          <p className="text-xs leading-relaxed text-red">
            <strong>{memberName}</strong> will lose access to{" "}
            <strong>{membershipName}</strong> immediately. Their current
            session will be cancelled. They will not be able to use it until
            you approve them again.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-border py-3 text-xs font-extrabold hover:bg-white/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={busy}
            className="flex-1 rounded-xl bg-red py-3 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Revoking…" : "Yes, revoke access"}
          </button>
        </div>
      </div>
    </div>
  );
}