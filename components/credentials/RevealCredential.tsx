"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

type RevealResponse = {
  type: string;
  payload: Record<string, unknown> | null;
  instructions: string | null;
  voucherExpiresAt: string | null;
  voucherRedeemUrl: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  SHARED_PASSWORD: "🔐 Username & password",
  PHONE_NUMBER: "📱 Phone number",
  MEMBER_ID: "🎫 Member ID",
  VOUCHER_CODE: "🎁 Voucher code",
  EMAIL_INVITE: "✉️ Email invite",
  OWNER_ACTION: "🤝 Owner action",
  CUSTOM_TEXT: "📝 Instructions",
};

export function RevealCredential({ membershipId }: { membershipId: string }) {
  const [data, setData] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  async function handleReveal() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<RevealResponse>(
        `/api/memberships/${membershipId}/credentials/reveal`,
        { method: "POST" }
      );
      setData(result);
      setRevealed(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_CREDENTIAL") {
        setError("The owner hasn't set up access details yet.");
      } else if (err instanceof ApiError && err.code === "NO_ACTIVE_ACCESS") {
        setError("You don't have active access to this membership.");
      } else if (err instanceof ApiError && err.code === "VOUCHER_USED") {
        setError("This voucher has already been used.");
      } else {
        setError(
          err instanceof ApiError ? err.message : "Couldn't fetch access."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (!revealed) {
    return (
      <div className="rounded-3xl border border-gold/25 bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-lg">
            🔑
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold">Your access</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Tap to reveal the access details the owner shared with you.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
            {error}
          </p>
        )}

        <button
          onClick={handleReveal}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-gold py-3 text-xs font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:opacity-60"
        >
          {loading ? "Loading…" : "Reveal access"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const label = TYPE_LABEL[data.type] ?? data.type;

  return (
    <div className="rounded-3xl border border-teal/25 bg-card p-6">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal">
        {label}
      </div>

      {/* Payload display */}
      {data.payload && (
        <div className="mt-4 space-y-2">
          {Object.entries(data.payload).map(([key, value]) => {
            if (value === null || value === undefined || value === "") return null;
            if (key === "otpRequired") return null;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-white/[0.02] px-4 py-3"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {key}
                </span>
                <code className="truncate font-mono text-sm font-bold text-ink">
                  {String(value)}
                </code>
              </div>
            );
          })}
        </div>
      )}

      {/* Voucher extras */}
      {data.type === "VOUCHER_CODE" && data.voucherRedeemUrl && (
        <a
          href={data.voucherRedeemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-center text-xs font-extrabold text-gold hover:bg-gold/10"
        >
          Redeem at {new URL(data.voucherRedeemUrl).hostname} →
        </a>
      )}

      {data.type === "VOUCHER_CODE" && data.voucherExpiresAt && (
        <p className="mt-3 text-center text-[11px] text-muted">
          Expires{" "}
          {new Date(data.voucherExpiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      {data.type === "EMAIL_INVITE" && (
        <p className="mt-3 rounded-xl border border-border bg-white/[0.02] p-3 text-xs leading-relaxed text-muted">
          The owner will send you the invite at the email on your account.
          Check your inbox (and spam) for the provider's invitation.
        </p>
      )}

      {data.type === "OWNER_ACTION" && (
        <p className="mt-3 rounded-xl border border-border bg-white/[0.02] p-3 text-xs leading-relaxed text-muted">
          The owner will perform this on your behalf. Coordinate with them
          directly.
        </p>
      )}

      {/* Instructions */}
      {data.instructions && (
        <div className="mt-4 rounded-xl border border-border bg-white/[0.02] p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
            Note from owner
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink">
            {data.instructions}
          </p>
        </div>
      )}

      {/* OTP warning if needed */}
      {typeof data.payload?.otpRequired === "boolean" &&
        data.payload.otpRequired === true && (
          <div className="mt-4 rounded-xl border border-amber-bg bg-amber-bg/40 p-3">
            <p className="text-[11px] leading-relaxed text-gold">
              <strong>OTP required:</strong> Contact the owner to forward the
              OTP when you use this.
            </p>
          </div>
        )}

      <button
        onClick={() => {
          setRevealed(false);
          setData(null);
        }}
        className="mt-4 w-full rounded-xl border border-border py-2.5 text-[11px] font-extrabold text-muted hover:text-ink"
      >
        Hide access details
      </button>
    </div>
  );
}