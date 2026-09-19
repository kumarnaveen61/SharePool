"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

type Group = {
  id: string;
  name: string;
  description: string | null;
  memberLimit: number;
  rules: string | null;
  inviteCode: string;
};

export function GroupAdminActions({ group }: { group: Group }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [memberLimit, setMemberLimit] = useState(String(group.memberLimit));
  const [rules, setRules] = useState(group.rules ?? "");

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/platform/groups/${group.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: description || undefined,
          memberLimit: Number(memberLimit),
          rules: rules || undefined,
        }),
      });
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setError(null);

    if (!confirmPassword) {
      setError("Please enter your password to confirm.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/auth/verify-password", {
        method: "POST",
        body: JSON.stringify({ password: confirmPassword }),
      });

      await apiFetch(`/api/platform/groups/${group.id}`, {
        method: "DELETE",
      });

      setDeleteOpen(false);
      setConfirmPassword("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_PASSWORD") {
        setError("Incorrect password. Try again.");
      } else {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[11px] font-extrabold text-ink transition-colors hover:border-gold hover:text-gold"
        >
          ✏️ Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmPassword("");
            setDeleteOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-red/30 px-3 py-2 text-[11px] font-extrabold text-red transition-colors hover:bg-red-bg"
        >
          🗑️ Delete
        </button>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setEditOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold">Edit group</h2>
            <p className="mt-1 text-xs text-muted">
              {group.inviteCode} · {group.name}
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  Member limit
                </span>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={memberLimit}
                  onChange={(e) => setMemberLimit(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  Rules
                </span>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={3}
                  className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={busy}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="flex-1 rounded-xl bg-gold py-2.5 text-xs font-extrabold text-[#1A1300] hover:bg-gold-dark disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setDeleteOpen(false)}
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
                <h2 className="text-lg font-extrabold">Delete this group?</h2>
                <p className="mt-0.5 text-xs text-muted">
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red/20 bg-red-bg/50 p-4">
              <p className="text-xs leading-relaxed text-red">
                Deleting <strong>{group.name}</strong> will permanently remove:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-red/90">
                <li>All members of this group</li>
                <li>All shared subscriptions in this group</li>
                <li>All access requests and sessions</li>
              </ul>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">
                Confirm your password to continue
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Your account password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-red/60"
              />
            </label>

            {error && (
              <p className="mt-4 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setConfirmPassword("");
                  setError(null);
                }}
                disabled={busy}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 rounded-xl bg-red py-2.5 text-xs font-extrabold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Yes, delete group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}