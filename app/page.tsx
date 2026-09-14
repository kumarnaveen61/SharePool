import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";

export default async function LandingPage() {
  // Already logged in? Skip straight to the app.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size={32} />
          <span className="text-lg font-extrabold tracking-tight">
            SharePool
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-bold text-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-amber-bg px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Private sharing network
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Share what your household
            <br />
            <span className="text-gold">already pays for.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted">
            SharePool is a private space for a family or a small trusted
            group to keep track of memberships and benefits, and offer each
            other a seat when there&apos;s room — only in the ways each
            provider actually allows.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-gold px-6 py-3.5 text-sm font-extrabold text-[#1A1300] transition-colors hover:bg-gold-dark sm:w-auto"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-border px-6 py-3.5 text-sm font-extrabold text-ink transition-colors hover:bg-card sm:w-auto"
            >
              Sign in
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-[11px] font-semibold text-muted">
            Trusted groups only · No public listings · Invite-only access
          </p>
        </div>
      </main>

      {/* Feature row */}
      <section className="border-t border-border bg-card/50 px-6 py-10 sm:px-10">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: "🔒",
              title: "Private by default",
              desc: "Only people you invite can see what's shared.",
            },
            {
              icon: "🤝",
              title: "Built around trust",
              desc: "Requests, approvals, and ratings keep it safe.",
            },
            {
              icon: "🎯",
              title: "Respects the rules",
              desc: "Every listing is marked for how it can legally be shared.",
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-white/5 text-lg">
                {f.icon}
              </div>
              <div>
                <div className="text-sm font-extrabold">{f.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-5 text-center text-[11px] text-muted sm:px-10">
        © {new Date().getFullYear()} SharePool · Share responsibly
      </footer>
    </div>
  );
}