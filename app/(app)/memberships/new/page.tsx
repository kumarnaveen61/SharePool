"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <NewMembershipForm />
    </Suspense>
  );
}

type MyGroup = { id: string; name: string };

function NewMembershipForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get("groupId") ?? "";

  const [groupId, setGroupId] = useState(urlGroupId);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [noGroups, setNoGroups] = useState(false);

  const [name, setName] = useState("");
  const [multiAccount, setMultiAccount] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [provider, setProvider] = useState("");
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [sharingEligibility, setSharingEligibility] = useState("OWNER_ASSISTED");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If no groupId in the URL, fetch the user's groups and auto-pick the first.
  useEffect(() => {
    if (urlGroupId) {
      setGroupsLoaded(true);
      return;
    }
    apiFetch<{ groups: MyGroup[] }>("/api/groups")
      .then(({ groups }) => {
        setMyGroups(groups);
        if (groups.length > 0) {
          setGroupId(groups[0].id);
        } else {
          setNoGroups(true);
        }
      })
      .catch(() => setError("Couldn't load your groups. Please refresh."))
      .finally(() => setGroupsLoaded(true));
  }, [urlGroupId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!groupId) {
      setError("Missing group. Create or join a group first.");
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

  // No groups at all — nudge the user to create or join one.
  if (groupsLoaded && noGroups) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          You&apos;re not in a group yet
        </h1>
        <p className="mt-3 text-sm text-muted">
          SharePool is private. Create a group or join one with an invite
          code before you can list a subscription.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/groups/new"
            className="rounded-xl bg-gold px-4 py-3 text-sm font-bold text-[#1A1300] hover:bg-gold-dark"
          >
            Create a group
          </Link>
          <Link
            href="/groups/join"
            className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-ink hover:bg-card"
          >
            Join with invite code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Add a membership</h1>
      <p className="mt-1.5 text-sm text-muted">
        Add something you already pay for, and mark honestly how it can be
        shared.
      </p>

      {!groupsLoaded && (
        <p className="mt-4 text-xs text-muted">Loading your groups…</p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        {myGroups.length > 1 && (
          <Field label="Which group?">
            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {myGroups.length === 1 && (
          <p className="text-xs text-muted">
            Adding to:{" "}
            <span className="font-semibold text-ink">{myGroups[0].name}</span>
          </p>
        )}

        <Field label="Account label">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Family Plan, My Account"
          />
          <p className="mt-1.5 text-[11px] text-muted">
            Give this account a memorable name so your group knows which one
            it is — like &ldquo;Family Plan&rdquo; or &ldquo;Arun&rsquo;s Account&rdquo;.
          </p>
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

        <Field label="Provider">
          <Input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Netflix"
          />
        </Field>

        {provider.trim().length > 0 && (
          <label className="flex items-start gap-3 rounded-xl border border-border bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={multiAccount}
              onChange={(e) => setMultiAccount(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
            />
            <div>
              <div className="text-xs font-bold text-ink">
                I already have another {provider.trim()} account
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                Tick this if you own multiple accounts from the same
                provider. Each account needs a unique Account Label below.
              </div>
            </div>
          </label>
        )}

        <Field label="Account Label">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              provider.trim()
                ? multiAccount
                  ? `e.g. Family ${provider.trim()}, Work ${provider.trim()}`
                  : `e.g. My ${provider.trim()}, Family Plan`
                : "e.g. Family Plan, My Account"
            }
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {multiAccount
              ? `Each ${provider.trim()} account needs a distinct label so your group can tell them apart.`
              : "A friendly name your group will see — like \u201CFamily Plan\u201D or \u201CMy Account\u201D."}
          </p>
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
                    ? "border-gold bg-gold/5"
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

        <Button
          type="submit"
          loading={loading}
          disabled={!groupId}
          className="mt-2 w-full"
        >
          Add membership
        </Button>
      </form>
    </div>
  );
}