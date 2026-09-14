"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { MembershipCard } from "@/components/membership/MembershipCard";
import { Input, Select } from "@/components/ui/Input";

type Membership = {
  id: string;
  name: string;
  category: string;
  provider: string | null;
  planName: string | null;
  status: string;
  sharingEligibility: string;
  remainingUnits: number | null;
  totalUnits: number | null;
  ownerId: string;
  owner?: { name: string };
};

const CATEGORIES = [
  "OTT", "MUSIC", "SHOPPING", "FOOD_DELIVERY", "PHARMACY", "HEALTHCARE",
  "TRAVEL", "AIRPORT_LOUNGE", "MOVIES", "FITNESS", "SOFTWARE", "EDUCATION",
  "HOTEL", "CREDIT_CARD_BENEFITS", "OTHER",
];

export function MembershipsBrowser({
  groupId,
  initialMemberships,
  currentUserId,
}: {
  groupId: string;
  initialMemberships: Array<Membership & { ownerName: string }>;
  currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [memberships, setMemberships] = useState(initialMemberships);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ groupId });
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (availableOnly) params.set("availableOnly", "true");

      apiFetch<{ memberships: Array<Membership & { owner: { name: string } }> }>(
        `/api/memberships?${params.toString()}`
      )
        .then(({ memberships }) =>
          setMemberships(memberships.map((m) => ({ ...m, ownerName: m.owner.name })))
        )
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, availableOnly, groupId]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search memberships…"
          className="flex-1"
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setAvailableOnly(e.target.checked)}
        />
        Available now only
      </label>

      {loading && <p className="mt-3 text-xs text-muted">Searching…</p>}

      {!loading && memberships.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          No memberships match{" "}
          <Link href={`/memberships/new?groupId=${groupId}`} className="font-medium text-brand">
            — add one?
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {memberships.map((m) => (
            <MembershipCard
              key={m.id}
              membership={m}
              ownerName={m.ownerName}
              isOwnMembership={m.ownerId === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
