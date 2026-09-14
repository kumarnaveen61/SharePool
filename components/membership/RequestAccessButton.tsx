"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function RequestAccessButton({ membershipId }: { membershipId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function handle() {
    setState("loading");
    try {
      await apiFetch("/api/access-requests", {
        method: "POST",
        body: JSON.stringify({
          membershipId,
          requestedUnits: 1,
          reason: "I'd like access to this subscription.",
        }),
      });
      setState("sent");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Failed to send request.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <span className="rounded-xl bg-teal-bg px-4 py-2.5 text-xs font-bold text-teal">
        ✓ Requested
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="rounded-xl bg-red-bg px-4 py-2.5 text-xs font-bold text-red">
        {msg}
      </span>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={state === "loading"}
      className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:opacity-60"
    >
      {state === "loading" ? "Sending..." : "Request access"}
    </button>
  );
}