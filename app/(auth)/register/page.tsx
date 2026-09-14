"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { BrandLogo } from "@/components/BrandLogo";

/* ── Inline icon components (tiny, no extra deps) ── */
function IconUser() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconEye({ off }: { off: boolean }) {
  return off ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type FieldProps = {
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  showToggle?: boolean;
};

function FormField({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  showToggle,
}: FieldProps) {
  const [reveal, setReveal] = useState(false);
  const realType = showToggle && reveal ? "text" : type;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 transition-colors focus-within:border-gold/60">
        <span className="text-muted">{icon}</span>
        <input
          type={realType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted/70"
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="text-muted transition-colors hover:text-ink"
            aria-label={reveal ? "Hide password" : "Show password"}
          >
            <IconEye off={!reveal} />
          </button>
        )}
      </div>
    </label>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!agree) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        {/* Brand header */}
<div className="mb-6 flex flex-col items-center gap-3">
  <BrandLogo size={48} />
  <span className="text-lg font-extrabold tracking-tight">SharePool</span>
</div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Your private sharing network.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <FormField
              label="Full name"
              icon={<IconUser />}
              value={name}
              onChange={setName}
              placeholder="Enter your full name"
              autoComplete="name"
            />

            <FormField
              label="Email address"
              icon={<IconMail />}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              autoComplete="email"
            />

            <FormField
              label="Password"
              icon={<IconLock />}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
              autoComplete="new-password"
              showToggle
            />

            <FormField
              label="Confirm password"
              icon={<IconLock />}
              type="password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Confirm your password"
              autoComplete="new-password"
              showToggle
            />

            <label className="flex items-start gap-2.5 pt-1 text-xs">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--gold)]"
              />
              <span className="text-muted">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-semibold text-gold hover:underline"
                >
                  Terms &amp; conditions
                </Link>
              </span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red/20 bg-red-bg px-3 py-2.5 text-xs font-semibold text-red"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-gold hover:underline"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}