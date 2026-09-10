"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

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
    hint: "The provider explicitly allows a family/multi-user plan.",
  },
  {
    value: "OWNER_ASSISTED",
    label: "Owner-assisted",
    hint: "You place the order or perform the action for them.",
  },
  {
    value: "TRANSFERABLE_BENEFIT",
    label: "Transferable benefit",
    hint: "A voucher or credit that can be handed to someone else.",
  },
  {
    value: "NOT_SHAREABLE",
    label: "Not shareable",
    hint: "For tracking only — this will never be offered to the group.",
  },
];

export default function NewMembershipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? "";

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [provider, setProvider] = useState("");
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [sharingEligibility, setSharingEligibility] = useState(
    "OWNER_ASSISTED"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!groupId) {
      setError("Missing group. Go back and try again from a group page.");
      return;
    }

    setLoading(true);
    try {
      const { membership } = await apiFetch<{ membership: { id: string } }>(
        "/api/memberships",
        {
          method: "POST",
          body: JSON.stringify({
            groupId,
            name,
            category,
            provider: provider || undefined,
            planName: planName || undefined,
            description: description || undefined,
            sharingEligibility,
          }),
        }
      );
      router.push(`/memberships/${membership.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Add a membership</h1>
      <p className="mt-1.5 text-sm text-muted">
        Add something you already pay for, and mark honestly how it can be
        shared.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Name">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Netflix Premium"
          />
        </Field>

        <Field label="Category">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Provider (optional)">
          <Input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Netflix"
          />
        </Field>

        <Field label="Plan name (optional)">
          <Input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Premium (4K, 4 screens)"
          />
        </Field>

        <Field label="Notes (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Anything the group should know"
          />
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            How can this be shared?
          </legend>
          <div className="flex flex-col gap-2">
            {ELIGIBILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm ${
                  sharingEligibility === opt.value
                    ? "border-brand bg-brand/5"
                    : "border-border bg-surface"
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-ink">
                  <input
                    type="radio"
                    name="eligibility"
                    value={opt.value}
                    checked={sharingEligibility === opt.value}
                    onChange={(e) => setSharingEligibility(e.target.value)}
                  />
                  {opt.label}
                </span>
                <span className="pl-5 text-xs text-muted">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Add membership
        </Button>
      </form>
    </div>
  );
}
