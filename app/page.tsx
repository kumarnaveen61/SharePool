import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-12 sm:max-w-lg">
      <div />
      <div>
        <div className="mb-8 h-10 w-10 rounded-lg bg-brand" aria-hidden />
        <h1 className="text-4xl font-semibold leading-tight text-ink">
          Share what your household already pays for.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          SharePool is a private space for a family or a small trusted group
          to keep track of memberships and benefits, and offer each other a
          seat when there's room — only in the ways each provider actually
          allows.
        </p>
      </div>
      <div className="mt-12 flex flex-col gap-3">
        <Link
          href="/register"
          className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-dark"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-ink hover:bg-background"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
