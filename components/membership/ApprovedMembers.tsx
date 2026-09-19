"use client";

import { useState } from "react";
import { RevokeMemberModal } from "./RevokeMemberModal";

export type ActiveMember = {
  sessionId: string;
  userId: string;
  userName: string;
  startTime: string | null;
  endTime: string | null;
  units: number | null;
  approvedAt: string;
};

function initialsFor(name: string) {
  const words = name.replace(/[^\w+ ]/g, " ").split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function timeLabel(m: ActiveMember) {
  if (m.units) {
    return `${m.units} unit${m.units === 1 ? "" : "s"}`;
  }
  if (m.endTime) {
    const end = new Date(m.endTime);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return "Ended";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m left`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h left`;
    return `until ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }
  return "Active";
}

export function ApprovedMembers({
  members,
  membershipName,
  onChanged,
}: {
  members: ActiveMember[];
  membershipName: string;
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = useState<ActiveMember | null>(null);

  if (members.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-xs text-muted">
          No one has active access right now.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="text-sm font-extrabold">Approved members</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {members.length} active right now
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {members.map((m) => (
            <div
              key={m.sessionId}
              className="flex items-center gap-3 px-6 py-3.5"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-[11px] font-extrabold text-ink">
                {initialsFor(m.userName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{m.userName}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {timeLabel(m)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevoking(m)}
                className="shrink-0 rounded-xl border border-red/30 px-3 py-2 text-[11px] font-extrabold text-red transition-colors hover:bg-red-bg"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>

      {revoking && (
        <RevokeMemberModal
          sessionId={revoking.sessionId}
          memberName={revoking.userName}
          membershipName={membershipName}
          onClose={() => setRevoking(null)}
          onRevoked={() => {
            setRevoking(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}