"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getDeepLink, openProvider } from "@/lib/deepLinks";

type RevealResponse = {
  type: string;
  payload: Record<string, unknown> | null;
  instructions: string | null;
  voucherExpiresAt: string | null;
  voucherRedeemUrl: string | null;
};

type Props = {
  membershipId: string;
  provider?: string | null;
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

const SENSITIVE_KEYS = new Set(["password", "code"]);
const AUTO_HIDE_SECONDS = 60;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        copied
          ? "border-teal/30 bg-teal-bg text-teal"
          : "border-border bg-white/[0.02] text-muted hover:border-gold/40 hover:text-gold"
      }`}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export function RevealCredential({ membershipId, provider }: Props) {
  const [data, setData] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const deepLink = getDeepLink(provider);

  // Auto-hide countdown — starts when revealed, resets on re-reveal
  useEffect(() => {
    if (!revealed) return;
    setSecondsLeft(AUTO_HIDE_SECONDS);

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRevealed(false);
          setData(null);
          setHiddenKeys(new Set());
          return AUTO_HIDE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [revealed]);

  function toggleKeyHidden(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleReveal() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<RevealResponse>(
        `/api/memberships/${membershipId}/credentials/reveal`,
        { method: "POST" }
      );
      setData(result);
      // Sensitive keys start hidden
      const hidden = new Set<string>();
      if (result.payload) {
        Object.keys(result.payload).forEach((k) => {
          if (SENSITIVE_KEYS.has(k)) hidden.add(k);
        });
      }
      setHiddenKeys(hidden);
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

  function handleHide() {
    setRevealed(false);
    setData(null);
    setHiddenKeys(new Set());
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
      {/* Header + countdown */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal">
          {label}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            secondsLeft <= 10
              ? "bg-red-bg text-red"
              : "bg-white/5 text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              secondsLeft <= 10 ? "bg-red" : "bg-teal"
            }`}
          />
          Hides in {secondsLeft}s
        </div>
      </div>

      {/* Payload rows with copy + reveal-per-field */}
      {data.payload && (
        <div className="mt-4 space-y-2">
          {Object.entries(data.payload).map(([key, value]) => {
            if (value === null || value === undefined || value === "") return null;
            if (key === "otpRequired") return null;

            const isSensitive = SENSITIVE_KEYS.has(key);
            const isHidden = isSensitive && hiddenKeys.has(key);
            const displayValue = isHidden ? "••••••••••" : String(value);

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {key}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-sm font-bold text-ink">
                    {displayValue}
                  </div>
                </div>

                {isSensitive && (
                  <button
                    type="button"
                    onClick={() => toggleKeyHidden(key)}
                    aria-label={isHidden ? "Show" : "Hide"}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.02] text-muted transition-colors hover:border-gold/40 hover:text-gold"
                  >
                    {isHidden ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    )}
                  </button>
                )}

                <CopyButton value={String(value)} />
              </div>
            );
          })}
        </div>
      )}

      {/* Deep link button */}
      {deepLink && (
        <button
          type="button"
          onClick={() => openProvider(provider)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-xs font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open {provider ?? "app"}
        </button>
      )}

      {/* Safety note */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-bg bg-amber-bg/40 p-3">
        <span className="text-sm">🛡️</span>
        <p className="text-[11px] leading-relaxed text-gold">
          <strong>Keep it safe:</strong> Don&apos;t save these to your browser
          or share the reveal link. Credentials hide automatically in{" "}
          {secondsLeft}s.
        </p>
      </div>

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
          Check your inbox (and spam) for the provider&apos;s invitation.
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

      {/* OTP warning */}
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
        onClick={handleHide}
        className="mt-4 w-full rounded-xl border border-border py-2.5 text-[11px] font-extrabold text-muted hover:text-ink"
      >
        Hide access details
      </button>
    </div>
  );
}
