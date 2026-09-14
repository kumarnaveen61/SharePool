"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { BrandLogo } from "@/components/BrandLogo";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
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
          <span className="text-lg font-extrabold tracking-tight">
            SharePool
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in to your sharing network.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Email */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">
                Email address
              </span>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 transition-colors focus-within:border-gold/60">
                <span className="text-muted">
                  <IconMail />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted/70"
                />
              </div>
            </label>

            {/* Password */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">
                Password
              </span>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 transition-colors focus-within:border-gold/60">
                <span className="text-muted">
                  <IconLock />
                </span>
                <input
                  type={reveal ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-muted/70"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="text-muted transition-colors hover:text-ink"
                  aria-label={reveal ? "Hide password" : "Show password"}
                >
                  <IconEye off={!reveal} />
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-gold hover:underline"
              >
                Forgot password?
              </Link>
            </div>

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
              className="w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-gold hover:underline"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}