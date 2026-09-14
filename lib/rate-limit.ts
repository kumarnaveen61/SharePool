/**
 * In-memory sliding-window rate limiter.
 *
 * LIMITATION (documented, not hidden): this state lives in the Node
 * process's memory. It works correctly for this single-instance sandbox,
 * but a real production deployment that runs multiple server instances
 * (which is normal for Next.js on most hosts) or restarts frequently
 * (serverless) needs a shared store instead — Redis (e.g. Upstash) is the
 * standard choice, with the exact same interface as `checkRateLimit`
 * below so call sites wouldn't need to change.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this Map doesn't grow forever in a
// long-running process. Not necessary for correctness — expired buckets
// are already ignored by checkRateLimit — just housekeeping.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key - unique identifier for the thing being limited, e.g.
 *   `login:${email}` or `login:ip:${ip}`. Callers should rate-limit by
 *   BOTH email and IP for auth endpoints — by email so an attacker can't
 *   just rotate IPs to keep guessing one account's password, and by IP so
 *   one attacker can't spray guesses across many accounts.
 * @param limit - max requests allowed within the window
 * @param windowMs - window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP extraction behind a reverse proxy / load balancer. */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
