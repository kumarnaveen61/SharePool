"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

type Health = {
  status: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  database: { connected: boolean; latencyMs: number; userCount: number };
  lastActivityAt: string | null;
  unreadNotifications: number;
  openReports: number;
  timestamp: string;
};

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function HealthDashboardPage() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<Health>("/api/platform/health")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load."));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            data.status === "healthy" ? "bg-success" : "bg-danger"
          }`}
        />
        <h1 className="text-2xl font-semibold text-ink capitalize">{data.status}</h1>
      </div>
      <p className="mt-1 text-xs text-muted">
        Last checked {new Date(data.timestamp).toLocaleTimeString()} — refreshes every 15s
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Database</span>
          <span className={data.database.connected ? "text-success" : "text-danger"}>
            {data.database.connected ? `Connected (${data.database.latencyMs}ms)` : "Unreachable"}
          </span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Server uptime</span>
          <span className="text-ink">{formatUptime(data.uptimeSeconds)}</span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Node version</span>
          <span className="text-ink">{data.nodeVersion}</span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Total users</span>
          <span className="text-ink">{data.database.userCount}</span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Last access session</span>
          <span className="text-ink">
            {data.lastActivityAt ? new Date(data.lastActivityAt).toLocaleString() : "None yet"}
          </span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Unread notifications</span>
          <span className="text-ink">{data.unreadNotifications}</span>
        </div>
        <div className="flex justify-between rounded-xl border border-border bg-surface p-3.5 text-sm">
          <span className="text-muted">Open reports</span>
          <span className="text-ink">{data.openReports}</span>
        </div>
      </div>
    </div>
  );
}
