"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

type ChecklistItem = {
  id: string;
  category: string;
  label: string;
  notes: string | null;
  isDone: boolean;
};

export default function LaunchChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiFetch<{ items: ChecklistItem[] }>("/api/platform/launch-checklist")
      .then(({ items }) => setItems(items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load."));
  }

  useEffect(load, []);

  async function toggle(item: ChecklistItem) {
    setBusyId(item.id);
    try {
      await apiFetch(`/api/platform/launch-checklist/${item.id}`, {
        method: "POST",
        body: JSON.stringify({ isDone: !item.isDone }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const doneCount = items.filter((i) => i.isDone).length;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Launch checklist</h1>
      <p className="mt-1 text-sm text-muted">
        {doneCount} of {items.length} items done
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: items.length ? `${(doneCount / items.length) * 100}%` : "0%" }}
        />
      </div>

      {categories.map((category) => (
        <div key={category} className="mt-6">
          <h2 className="text-sm font-medium text-muted">{category}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {items
              .filter((i) => i.category === category)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item)}
                  disabled={busyId === item.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      item.isDone
                        ? "border-success bg-success text-white"
                        : "border-border bg-surface"
                    }`}
                  >
                    {item.isDone && "✓"}
                  </span>
                  <span>
                    <span
                      className={`block text-sm ${
                        item.isDone ? "text-muted line-through" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.notes && (
                      <span className="mt-0.5 block text-xs text-muted">{item.notes}</span>
                    )}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
