"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

type Analytics = {
  totals: {
    users: number;
    groups: number;
    memberships: number;
    accessSessions: number;
    openReports: number;
    creditsInCirculation: number;
  };
  membershipsByCategory: Array<{ category: string; value: number }>;
  requestsByStatus: Array<{ status: string; value: number }>;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

export default function PlatformAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Analytics>("/api/platform/analytics")
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load analytics.")
      );
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Platform analytics</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard label="Users" value={data.totals.users} />
        <StatCard label="Groups" value={data.totals.groups} />
        <StatCard label="Memberships" value={data.totals.memberships} />
        <StatCard label="Access sessions" value={data.totals.accessSessions} />
        <StatCard label="Open reports" value={data.totals.openReports} />
        <StatCard label="Credits in circulation" value={data.totals.creditsInCirculation} />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-muted">Memberships by category</h2>
        <div className="mt-2 flex flex-col gap-1.5">
          {data.membershipsByCategory.map((c) => (
            <div key={c.category} className="flex justify-between text-sm">
              <span className="text-ink">{c.category.replace(/_/g, " ")}</span>
              <span className="text-muted">{c.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-muted">Requests by status</h2>
        <div className="mt-2 flex flex-col gap-1.5">
          {data.requestsByStatus.map((s) => (
            <div key={s.status} className="flex justify-between text-sm">
              <span className="text-ink">{s.status}</span>
              <span className="text-muted">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
