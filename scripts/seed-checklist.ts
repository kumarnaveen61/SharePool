import "dotenv/config";
import { db, pool } from "../lib/db";
import { launchChecklistItems } from "../lib/db/schema";

const items: Array<{
  category: string;
  label: string;
  notes: string;
  isDone: boolean;
  sortOrder: number;
}> = [
  // Security
  {
    category: "Security",
    label: "Password hashing (bcrypt)",
    notes: "Done — Phase 1.",
    isDone: true,
    sortOrder: 1,
  },
  {
    category: "Security",
    label: "Server-side authorization on every route",
    notes: "Done — every route re-derives identity from the session; never trusts client-supplied IDs.",
    isDone: true,
    sortOrder: 2,
  },
  {
    category: "Security",
    label: "Email verification",
    notes: "Done — Phase 5. Uses a logged/dev-returned link since no email provider is connected.",
    isDone: true,
    sortOrder: 3,
  },
  {
    category: "Security",
    label: "Password reset with session invalidation",
    notes: "Done — Phase 5, tested: resetting a password kills every existing session.",
    isDone: true,
    sortOrder: 4,
  },
  {
    category: "Security",
    label: "Rate limiting on auth endpoints",
    notes: "Done — Phase 6. In-memory only; needs Redis for multi-instance production deployments.",
    isDone: true,
    sortOrder: 5,
  },
  {
    category: "Security",
    label: "Google / social login",
    notes: "NOT DONE — needs real OAuth credentials and outbound network access this environment doesn't have.",
    isDone: false,
    sortOrder: 6,
  },
  {
    category: "Security",
    label: "Real email provider connected (Resend/Postmark/SES)",
    notes: "NOT DONE — lib/mailer.ts is a stub; swap its two functions for a real provider.",
    isDone: false,
    sortOrder: 7,
  },

  // Infrastructure
  {
    category: "Infrastructure",
    label: "Production database provisioned (managed Postgres)",
    notes: "NOT DONE — this project only ran against a local Postgres in a sandbox.",
    isDone: false,
    sortOrder: 1,
  },
  {
    category: "Infrastructure",
    label: "Environment variables set in hosting provider",
    notes: "NOT DONE — DATABASE_URL, JWT_SECRET, etc. need real values outside .env.",
    isDone: false,
    sortOrder: 2,
  },
  {
    category: "Infrastructure",
    label: "Backup script written and tested",
    notes: "Done — Phase 6. scripts/backup.sh and restore.sh both actually run and verified (backed up, then restored into a scratch DB and confirmed row counts).",
    isDone: true,
    sortOrder: 3,
  },
  {
    category: "Infrastructure",
    label: "Automated backup schedule configured",
    notes: "NOT DONE — the script exists; nothing calls it on a schedule yet (needs cron or a managed-Postgres backup feature).",
    isDone: false,
    sortOrder: 4,
  },
  {
    category: "Infrastructure",
    label: "Background job scheduler for session expiry",
    notes: "Done — Phase 6, via instrumentation.ts. Works for a single long-running instance; a serverless/multi-instance deployment needs a real cron or queue instead.",
    isDone: true,
    sortOrder: 5,
  },
  {
    category: "Infrastructure",
    label: "Health check endpoint",
    notes: "Done — Phase 6. Public /api/health plus a detailed SUPER_ADMIN /api/platform/health.",
    isDone: true,
    sortOrder: 6,
  },

  // Quality
  {
    category: "Quality",
    label: "Automated test suite",
    notes: "Done — Phase 6. 8 tests via node:test covering auth, session invalidation, IDOR protection, NOT_SHAREABLE enforcement, and blocking. Not exhaustive coverage.",
    isDone: true,
    sortOrder: 1,
  },
  {
    category: "Quality",
    label: "CI pipeline running tests on every push",
    notes: "NOT DONE — tests run manually (npm test) against a locally running dev server; no CI config exists yet.",
    isDone: false,
    sortOrder: 2,
  },
  {
    category: "Quality",
    label: "Error tracking / monitoring (e.g. Sentry)",
    notes: "NOT DONE — errors currently only go to console.error.",
    isDone: false,
    sortOrder: 3,
  },

  // Product completeness
  {
    category: "Product completeness",
    label: "maxSimultaneousUsers enforcement (overlapping request conflicts)",
    notes: "NOT DONE — stored but not enforced; a second overlapping request on the same time-based membership isn't blocked.",
    isDone: false,
    sortOrder: 1,
  },
  {
    category: "Product completeness",
    label: "Group ownership transfer",
    notes: "NOT DONE — a group's OWNER is permanent short of a direct database edit.",
    isDone: false,
    sortOrder: 2,
  },
  {
    category: "Product completeness",
    label: "Admin credit-rule configuration",
    notes: "NOT DONE — contribute/share/use credit amounts are fixed constants, not admin-configurable.",
    isDone: false,
    sortOrder: 3,
  },
  {
    category: "Product completeness",
    label: "PWA installability",
    notes: "Done — Phase 6. Manifest, generated icons, and a minimal offline-fallback service worker.",
    isDone: true,
    sortOrder: 4,
  },

  // Legal & compliance
  {
    category: "Legal & compliance",
    label: "Privacy policy",
    notes: "NOT DONE.",
    isDone: false,
    sortOrder: 1,
  },
  {
    category: "Legal & compliance",
    label: "Terms of service",
    notes: "NOT DONE.",
    isDone: false,
    sortOrder: 2,
  },
];

async function main() {
  console.log("Seeding launch checklist…");
  await db.insert(launchChecklistItems).values(items);
  console.log(`Inserted ${items.length} checklist items.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
