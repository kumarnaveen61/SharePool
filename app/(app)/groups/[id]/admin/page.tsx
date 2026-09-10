"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

type Group = {
  id: string;
  name: string;
  description: string | null;
  memberLimit: number;
  rules: string | null;
};

type Report = {
  id: string;
  status: string;
  targetType: string;
  targetUserName: string | null;
  targetMembershipName: string | null;
  reason: string;
  reportedBy: string;
  createdAt: string;
};

type AdminAction = {
  id: string;
  action: string;
  adminName: string;
  targetUserName: string | null;
  reason: string | null;
  createdAt: string;
};

const tabs = ["settings", "reports", "activity"] as const;

export default function GroupAdminPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("settings");
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberLimit, setMemberLimit] = useState("10");
  const [rules, setRules] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Activity
  const [actions, setActions] = useState<AdminAction[]>([]);

  async function loadSettings() {
    try {
      const { group } = await apiFetch<{ group: Group }>(`/api/groups/${params.id}`);
      setGroup(group);
      setName(group.name);
      setDescription(group.description ?? "");
      setMemberLimit(String(group.memberLimit));
      setRules(group.rules ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load group.");
    }
  }

  async function loadReports() {
    try {
      const { reports } = await apiFetch<{ reports: Report[] }>(
        `/api/groups/${params.id}/reports`
      );
      setReports(reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load reports.");
    }
  }

  async function loadActivity() {
    try {
      const { actions } = await apiFetch<{ actions: AdminAction[] }>(
        `/api/groups/${params.id}/activity`
      );
      setActions(actions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load activity.");
    }
  }

  useEffect(() => {
    setError(null);
    if (tab === "settings") loadSettings();
    if (tab === "reports") loadReports();
    if (tab === "activity") loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, params.id]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSavedSettings(false);
    setError(null);
    try {
      await apiFetch(`/api/groups/${params.id}/settings`, {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          memberLimit: Number(memberLimit),
          rules: rules || undefined,
        }),
      });
      setSavedSettings(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function resolveReport(id: string, status: "REVIEWED" | "DISMISSED" | "ACTIONED") {
    setResolvingId(id);
    try {
      await apiFetch(`/api/reports/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await loadReports();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Group admin</h1>

      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${
              tab === t ? "bg-brand text-white" : "bg-surface text-muted border border-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {tab === "settings" && group && (
        <form onSubmit={saveSettings} className="mt-6 flex flex-col gap-4">
          <Field label="Group name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Member limit">
            <Input
              type="number"
              min={2}
              max={50}
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
            />
          </Field>
          <Field label="Group rules">
            <Textarea
              rows={4}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. Please return access on time; don't share outside the family."
            />
          </Field>
          {savedSettings && <p className="text-sm text-success">Saved.</p>}
          <Button type="submit" loading={savingSettings}>
            Save settings
          </Button>
        </form>
      )}

      {tab === "reports" && (
        <div className="mt-6 flex flex-col gap-3">
          {reports.length === 0 && (
            <p className="text-sm text-muted">No reports filed in this group.</p>
          )}
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-ink">
                  Report on {r.targetType === "USER" ? r.targetUserName : r.targetMembershipName}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.status === "OPEN"
                      ? "bg-accent/10 text-accent-dark"
                      : "bg-background text-muted"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink">&ldquo;{r.reason}&rdquo;</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(r.createdAt).toLocaleString()}
              </p>
              {r.status === "OPEN" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    loading={resolvingId === r.id}
                    onClick={() => resolveReport(r.id, "ACTIONED")}
                    className="flex-1"
                  >
                    Mark actioned
                  </Button>
                  <Button
                    variant="ghost"
                    loading={resolvingId === r.id}
                    onClick={() => resolveReport(r.id, "DISMISSED")}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <div className="mt-6 flex flex-col gap-2">
          {actions.length === 0 && (
            <p className="text-sm text-muted">No admin actions yet.</p>
          )}
          {actions.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
              <p className="text-ink">
                <span className="font-medium">{a.adminName}</span>{" "}
                {a.action.replace(/_/g, " ").toLowerCase()}
                {a.targetUserName ? ` — ${a.targetUserName}` : ""}
              </p>
              {a.reason && <p className="mt-0.5 text-xs text-muted">{a.reason}</p>}
              <p className="mt-0.5 text-xs text-muted">
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
