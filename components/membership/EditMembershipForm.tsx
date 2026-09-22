"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

type Membership = {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  planName: string | null;
  description: string | null;
  sharingEligibility: string;
};

const CATEGORIES = [
  "OTT",
  "MUSIC",
  "SHOPPING",
  "FOOD_DELIVERY",
  "PHARMACY",
  "HEALTHCARE",
  "TRAVEL",
  "AIRPORT_LOUNGE",
  "MOVIES",
  "FITNESS",
  "SOFTWARE",
  "EDUCATION",
  "HOTEL",
  "CREDIT_CARD_BENEFITS",
  "OTHER",
];

const ELIGIBILITY_OPTIONS = [
  {
    value: "OFFICIALLY_SHAREABLE",
    label: "Officially shareable",
    hint: "Provider allows family/multi-user.",
  },
  {
    value: "OWNER_ASSISTED",
    label: "Owner-assisted",
    hint: "You perform the action for them.",
  },
  {
    value: "TRANSFERABLE_BENEFIT",
    label: "Transferable benefit",
    hint: "A voucher or credit handed over.",
  },
  {
    value: "NOT_SHAREABLE",
    label: "Not shareable",
    hint: "Tracking only — never offered.",
  },
];

export function EditMembershipForm({
  membership,
}: {
  membership: Membership;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(membership.name);
  const [category, setCategory] = useState(membership.category);
  const [provider, setProvider] = useState(membership.provider ?? "");
  const [planName, setPlanName] = useState(membership.planName ?? "");
  const [description, setDescription] = useState(membership.description ?? "");
  const [sharingEligibility, setSharingEligibility] = useState(
    membership.sharingEligibility
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);

    try {
      await apiFetch(`/api/memberships/${membership.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          category,
          provider: provider || undefined,
          planName: planName || undefined,
          description: description || undefined,
          sharingEligibility,
        }),
      });
      setSuccess(true);
      setOpen(false);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-sm">
            ✏️
          </div>
          <div className="text-left">
            <div className="text-sm font-extrabold">Edit details</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Name, category, provider, plan
            </div>
          </div>
        </div>
        <span
          className={`text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {success && !open && (
        <div className="border-t border-teal/30 bg-teal-bg/40 px-6 py-3">
          <p className="text-xs font-bold text-teal">✓ Changes saved</p>
        </div>
      )}

      {open && (
        <form
          onSubmit={handleSave}
          className="space-y-4 border-t border-border px-6 py-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">
              Account Label
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">
              Category
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">
              Provider
            </span>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Netflix"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">
              Plan name (optional)
            </span>
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Premium (4K, 4 screens)"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold text-muted">
              Notes (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>

          <div>
            <span className="mb-2 block text-[11px] font-bold text-muted">
              How can this be shared?
            </span>
            <div className="space-y-2">
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-xs ${
                    sharingEligibility === opt.value
                      ? "border-gold bg-gold/5"
                      : "border-border bg-white/[0.02]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold text-ink">
                    <input
                      type="radio"
                      name="eligibility"
                      value={opt.value}
                      checked={sharingEligibility === opt.value}
                      onChange={(e) => setSharingEligibility(e.target.value)}
                      className="accent-[color:var(--gold)]"
                    />
                    {opt.label}
                  </span>
                  <span className="pl-5 text-[10px] text-muted">
                    {opt.hint}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="flex-1 rounded-xl border border-border py-2.5 text-xs font-extrabold hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-gold py-2.5 text-xs font-extrabold text-[#1A1300] hover:bg-gold-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
