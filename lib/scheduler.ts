import { expireOverdueSessions } from "@/lib/session-expiry";

/**
 * Real interval-based scheduler for the session-expiry sweep, replacing
 * the lazy "only checked when someone happens to load a page" behavior
 * from earlier phases with a proper periodic job.
 *
 * LIMITATION (documented, not hidden): `setInterval` inside the Next.js
 * server process works for this sandbox and for a traditional
 * single-instance Node deployment, but it is NOT a substitute for a real
 * job scheduler in most production setups:
 *   - Serverless/edge deployments (Vercel, etc.) don't keep a process
 *     alive between requests, so this interval would never fire. Use the
 *     platform's cron feature (e.g. Vercel Cron) hitting a route that
 *     calls `expireOverdueSessions()` instead.
 *   - Multiple server instances would each run their own interval,
 *     redundantly (harmless here since the query is idempotent, but
 *     wasteful) — a real queue (BullMQ + Redis, or a DB-based job table
 *     with a leader-election lock) is the correct fix at that scale.
 *
 * This module is written so swapping the trigger mechanism (interval →
 * cron route → queue worker) doesn't require touching
 * `expireOverdueSessions` itself — the business logic and the scheduling
 * mechanism are already separate.
 */
let started = false;

export function startSessionExpiryScheduler(intervalMs = 60_000) {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      const count = await expireOverdueSessions();
      console.log(`[scheduler] sweep ran, expired ${count} overdue session(s)`);
    } catch (err) {
      console.error("[scheduler] session expiry sweep failed", err);
    }
  };

  run(); // run once immediately on startup, then on the interval
  const timer = setInterval(run, intervalMs);
  timer.unref?.(); // don't keep the process alive solely for this timer
  console.log(`[scheduler] started, interval=${intervalMs}ms`);
}
