# SharePool — Phase 1 through Phase 6 (complete)

A private, invite-only space for a trusted group (household, close family)
to track memberships/benefits they already pay for and responsibly offer a
seat to each other — only in ways each provider actually permits.

## What's implemented

**Phase 1** — Auth, groups (invite-code join), memberships (CRUD, categories,
sharing-eligibility field), owner-set availability windows.

**Phase 2** — Request & approval system: time-based and quantity-based
access requests, owner approve/reject, access sessions, Pool Credits
ledger, in-app notifications.

**Phase 3** — Trust & reputation, member profiles, search & filter:
requester-only ratings, trust score on member profiles, search/category/
availability filters.

**Phase 4** — Admin panel & safety: group admin dashboard, suspend/remove
members, remove memberships, report user/membership, block user.

**Phase 5** — Authentication hardening, platform analytics, demo data:
email verification, password reset with session invalidation, "log out
everywhere", a platform-level SUPER_ADMIN role, and demo data expanded to
21 users / 15 memberships matching the spec.

**Phase 6** — Production-readiness:
- **Rate limiting** on every auth endpoint (login, register,
  forgot-password, reset-password, resend-verification), by IP and by
  email. Thresholds are centralized in `lib/rate-limit-config.ts` and are
  intentionally stricter in production than in dev/test — the automated
  test suite itself tripped the strict limits during development, which
  confirmed the mechanism works before the config was made
  environment-aware.
- **A real background scheduler** replacing the "lazy, check-on-read"
  session expiry from earlier phases. Wired through Next.js's
  `instrumentation.ts` hook, confirmed in the server log actually
  starting and actually expiring an overdue session on its first sweep.
- **PWA installability**: a real manifest, generated icons (192/512/apple-
  touch, not placeholders), and a minimal service worker with an
  offline-fallback strategy.
- **An automated test suite** (`npm test`, via Node's built-in test
  runner) — 8 tests, all passing, covering registration/login, the
  password-reset session-invalidation property, cross-group IDOR
  protection, `NOT_SHAREABLE` enforcement, and blocking. Run against a
  live dev server rather than mocks, so it's exercising the real
  authorization code paths.
- **Backup & restore**, actually tested end-to-end: `scripts/backup.sh`
  produced a real `pg_dump`, and `scripts/restore.sh` was used to restore
  that exact file into a fresh scratch database, with the row count
  confirmed to match afterward.
- **Health dashboard**: a minimal public `/api/health` (for load
  balancers/uptime monitors — deliberately reveals nothing about internal
  state) plus a detailed `/platform/health` for `SUPER_ADMIN`s showing DB
  latency, uptime, user count, last activity, unread notifications, and
  open reports.
- **Launch checklist with status tracking**: a real database-backed,
  toggleable checklist (`/platform/launch-checklist`) seeded with an
  honest accounting of this project's actual state — 22 items across
  Security, Infrastructure, Quality, Product completeness, and Legal —
  10 done, 12 explicitly not done, each with a note explaining why.

## Running locally

```bash
# 1. Install deps
npm install

# 2. Set up Postgres and update .env with your DATABASE_URL
cp .env.example .env

# 3. Push the schema (creates tables)
npm run db:push

# 4. Seed demo data + the launch checklist
npm run db:seed
npm run db:seed-checklist
# Demo logins (all password: password123):
#   Platform admin: admin@demo.sharepool.app
#   Group owner:    naveen.kumar@demo.sharepool.app
#   Group admin:    arun.prasad@demo.sharepool.app
# Demo invite code: DEMO2026

# 5. Run the dev server
npm run dev

# 6. Run the automated test suite (with the dev server running)
npm test

# 7. Take a database backup (with .env loaded)
export $(cat .env | xargs) && ./scripts/backup.sh
```

## Read this before deploying anywhere real

The launch checklist at `/platform/launch-checklist` (log in as
`admin@demo.sharepool.app`) is the authoritative, current list — check
that instead of trusting this file to stay in sync as the project
changes. As of this writing, the biggest gaps it flags are:

- No real email provider connected (verification/reset links are
  logged to the console and returned in dev-mode API responses instead)
- No Google/social login (needs real OAuth credentials + network access
  this sandbox doesn't have)
- No production database, hosting, or CI pipeline configured — this was
  all built and run inside a local sandbox
- No error tracking/monitoring (Sentry or equivalent)
- `maxSimultaneousUsers` isn't enforced (no overlap check on concurrent
  time-based requests)
- No group-ownership transfer, no admin credit-rule configuration
- No privacy policy or terms of service

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS + PostgreSQL +
Drizzle ORM (chosen over Prisma — no native engine binaries to download,
which matters in network-restricted environments, and it's a fully
production-viable choice, arguably a better fit if you later deploy to
serverless/edge).

## Continuing this project

This was built in a chat sandbox that doesn't persist between
conversations. For real deployment — provisioning production Postgres,
connecting a real email provider, setting up CI, adding OAuth — hand this
off to **Claude Code**, which can work on the same repo across sessions,
run a persistent dev database, and execute the test suite as it goes.
