"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token.");
      return;
    }
    apiFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus("done"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      });
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
      {status === "loading" && <p className="text-sm text-muted">Verifying…</p>}
      {status === "done" && (
        <>
          <h1 className="text-2xl font-semibold text-ink">Email verified</h1>
          <p className="mt-2 text-sm text-muted">You&apos;re all set.</p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-2xl font-semibold text-ink">Couldn&apos;t verify</h1>
          <p className="mt-2 text-sm text-danger">{error}</p>
        </>
      )}
      <Link href="/dashboard" className="mt-6 text-sm font-medium text-brand">
        Go to dashboard
      </Link>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
          <p className="text-sm text-muted">Loading…</p>
        </main>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}