"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ devResetLink?: string }>(
        "/api/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) }
      );
      setSent(true);
      if (result.devResetLink) setDevLink(result.devResetLink);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">
        We&apos;ll send a reset link to your email.
      </p>

      {sent ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-4 text-sm text-ink">
          <p>If an account exists for that email, a reset link has been sent.</p>
          {devLink && (
            <p className="mt-3 text-xs text-muted">
              No email provider is connected in this environment, so here&apos;s
              the link directly:{" "}
              <Link href={devLink.replace(/^https?:\/\/[^/]+/, "")} className="font-medium text-brand break-all">
                {devLink}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Email">
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
