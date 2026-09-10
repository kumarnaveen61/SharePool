import Link from "next/link";

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
};

const eligibilityLabel: Record<string, { label: string; dot: string }> = {
  OFFICIALLY_SHAREABLE: { label: "Officially shareable", dot: "bg-success" },
  OWNER_ASSISTED: { label: "Owner-assisted", dot: "bg-accent" },
  TRANSFERABLE_BENEFIT: { label: "Transferable benefit", dot: "bg-brand" },
  NOT_SHAREABLE: { label: "Not shareable", dot: "bg-danger" },
};

const statusLabel: Record<string, string> = {
  AVAILABLE: "Available now",
  IN_USE: "In use",
  UNAVAILABLE: "Not offered",
  SCHEDULED: "Scheduled",
  PENDING_APPROVAL: "Pending",
};

export function MembershipCard({
  membership,
  ownerName,
  isOwnMembership,
}: {
  membership: Membership;
  ownerName: string;
  isOwnMembership: boolean;
}) {
  const elig = eligibilityLabel[membership.sharingEligibility];

  return (
    <Link
      href={`/memberships/${membership.id}`}
      className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 hover:border-brand"
    >
      <div>
        <p className="font-medium text-ink">{membership.name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {membership.planName ? `${membership.planName} · ` : ""}
          {ownerName}
          {isOwnMembership ? " (you)" : ""}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${elig.dot}`} />
          <span className="text-xs text-muted">{elig.label}</span>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
          membership.status === "AVAILABLE"
            ? "bg-success/10 text-success"
            : "bg-background text-muted"
        }`}
      >
        {statusLabel[membership.status] ?? membership.status}
      </span>
    </Link>
  );
}
