"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  credentialMeta,
  credentialTypeValues,
  type CredentialType,
} from "@/lib/credentials/types";

type ExistingCredential = {
  id: string;
  type: CredentialType;
  instructions: string | null;
  voucherExpiresAt: string | null;
  voucherRedeemUrl: string | null;
  voucherUsedAt: string | null;
  hasEncryptedPayload: boolean;
} | null;

export function CredentialForm({ membershipId }: { membershipId: string }) {
  const [existing, setExisting] = useState<ExistingCredential>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Form state
  const [type, setType] = useState<CredentialType>("SHARED_PASSWORD");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherExpiresAt, setVoucherExpiresAt] = useState("");
  const [voucherRedeemUrl, setVoucherRedeemUrl] = useState("");
  const [customText, setCustomText] = useState("");
  const [instructions, setInstructions] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { credential } = await apiFetch<{
        credential: ExistingCredential;
      }>(`/api/memberships/${membershipId}/credentials`);
      setExisting(credential);
      if (credential) {
        setType(credential.type);
        setInstructions(credential.instructions ?? "");
        setVoucherExpiresAt(
          credential.voucherExpiresAt
            ? new Date(credential.voucherExpiresAt).toISOString().slice(0, 16)
            : ""
        );
        setVoucherRedeemUrl(credential.voucherRedeemUrl ?? "");
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipId]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      let payload: Record<string, unknown> = {};

      switch (type) {
        case "SHARED_PASSWORD":
          payload = { username, password };
          break;
        case "PHONE_NUMBER":
          payload = { phone, name: phoneName || undefined, otpRequired };
          break;
        case "MEMBER_ID":
          payload = { memberId, name: memberName || undefined };
          break;
        case "VOUCHER_CODE":
          payload = { code: voucherCode };
          break;
        case "CUSTOM_TEXT":
          payload = { text: customText };
          break;
        case "EMAIL_INVITE":
        case "OWNER_ACTION":
          payload = {};
          break;
      }

      await apiFetch(`/api/memberships/${membershipId}/credentials`, {
        method: "POST",
        body: JSON.stringify({
          type,
          payload,
          instructions: instructions || undefined,
          voucherExpiresAt:
            type === "VOUCHER_CODE" && voucherExpiresAt
              ? new Date(voucherExpiresAt).toISOString()
              : undefined,
          voucherRedeemUrl:
            type === "VOUCHER_CODE" && voucherRedeemUrl
              ? voucherRedeemUrl
              : undefined,
        }),
      });

      setEditing(false);
      // Clear sensitive inputs
      setUsername("");
      setPassword("");
      setPhone("");
      setMemberId("");
      setVoucherCode("");
      setCustomText("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove the access details for this membership?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/memberships/${membershipId}/credentials`, {
        method: "DELETE",
      });
      setExisting(null);
      setEditing(false);
      setInstructions("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-white/5" />
        <div className="mt-3 h-10 animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  // Not set up yet + not editing → prompt
  if (!existing && !editing) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-lg">
            🔑
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold">Access details</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Set up how the requester will actually get access after you
              approve them.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-xl bg-gold py-3 text-xs font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark"
        >
          Set up access
        </button>
      </div>
    );
  }

  // Already set up + not editing → show summary
  if (existing && !editing) {
    const meta = credentialMeta[existing.type];
    return (
      <div className="rounded-3xl border border-teal/20 bg-teal-bg/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-lg">
              {meta.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold">Access details set</div>
              <div className="mt-0.5 text-xs text-teal">{meta.label}</div>
              {existing.instructions && (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted">
                  {existing.instructions}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-extrabold hover:bg-white/5"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="rounded-lg border border-red/30 px-3 py-1.5 text-[10px] font-extrabold text-red hover:bg-red-bg"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Editing → full form
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold">
          {existing ? "Edit access details" : "Set up access details"}
        </div>
        <button
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="text-[11px] font-bold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>

      {/* Type picker */}
      <div className="mt-4 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
          How will you share this?
        </div>
        <div className="grid gap-2">
          {credentialTypeValues.map((t) => {
            const meta = credentialMeta[t];
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-gold bg-gold/5"
                    : "border-border bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <span className="text-lg">{meta.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink">
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    {meta.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional fields */}
      <div className="mt-5 space-y-3">
        {type === "SHARED_PASSWORD" && (
          <>
            <Field label="Username / email">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="arun@example.com"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
          </>
        )}

        {type === "PHONE_NUMBER" && (
          <>
            <Field label="Phone number">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <Field label="Name to mention (optional)">
              <input
                value={phoneName}
                onChange={(e) => setPhoneName(e.target.value)}
                placeholder="Arun Kumar"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <label className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] p-3">
              <input
                type="checkbox"
                checked={otpRequired}
                onChange={(e) => setOtpRequired(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--gold)]"
              />
              <span className="text-xs text-muted">
                OTP is sent to this phone — requester must ping me to forward it
              </span>
            </label>
          </>
        )}

        {type === "MEMBER_ID" && (
          <>
            <Field label="Member ID">
              <input
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="PVR-1234567"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <Field label="Name on account (optional)">
              <input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Arun Kumar"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
          </>
        )}

        {type === "VOUCHER_CODE" && (
          <>
            <Field label="Voucher code">
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="XYZ-123-ABC"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <Field label="Expires on (optional)">
              <input
                type="datetime-local"
                value={voucherExpiresAt}
                onChange={(e) => setVoucherExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
            <Field label="Redeem URL (optional)">
              <input
                value={voucherRedeemUrl}
                onChange={(e) => setVoucherRedeemUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
              />
            </Field>
          </>
        )}

        {type === "CUSTOM_TEXT" && (
          <Field label="What should the requester see?">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              placeholder="Enter any details they need…"
              className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </Field>
        )}

        {(type === "EMAIL_INVITE" || type === "OWNER_ACTION") && (
          <p className="rounded-xl border border-border bg-white/[0.02] p-3 text-[11px] leading-relaxed text-muted">
            {type === "EMAIL_INVITE"
              ? "You'll enter the requester's email at approval time. The provider sends them the invite."
              : "You'll perform the action yourself. Just add a note below so they know what to expect."}
          </p>
        )}

        {/* Instructions — always shown */}
        <Field label="Instructions for the requester (optional)">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder={
              type === "PHONE_NUMBER"
                ? "Walk in, say the phone number and name at the counter."
                : type === "OWNER_ACTION"
                  ? "I'll book the slot once you approve. Ping me on WhatsApp."
                  : "Any note they should know."
            }
            className="w-full resize-vertical rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold/60"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red/20 bg-red-bg px-3 py-2 text-xs font-semibold text-red">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-gold py-3 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : existing ? "Update access details" : "Save access details"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}