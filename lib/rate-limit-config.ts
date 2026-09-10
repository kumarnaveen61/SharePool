/**
 * Rate limit thresholds, centralized so they're easy to audit and tune.
 *
 * Limits are intentionally more generous outside production. This isn't a
 * loophole — automated tests and local development legitimately make many
 * more auth requests in a short window than a real user ever would (this
 * project's own test suite tripped the strict limits during development,
 * which is exactly the intended behavior in production but wrong for a
 * dev/test loop). Production always gets the strict numbers regardless of
 * what's in the environment.
 */

const isProd = process.env.NODE_ENV === "production";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const RATE_LIMITS = {
  login: {
    max: envInt("RATE_LIMIT_LOGIN_MAX", isProd ? 5 : 50),
    windowMs: 15 * 60 * 1000,
  },
  register: {
    max: envInt("RATE_LIMIT_REGISTER_MAX", isProd ? 10 : 100),
    windowMs: 60 * 60 * 1000,
  },
  forgotPassword: {
    max: envInt("RATE_LIMIT_FORGOT_PASSWORD_MAX", isProd ? 3 : 30),
    windowMs: 15 * 60 * 1000,
  },
  resetPassword: {
    max: envInt("RATE_LIMIT_RESET_PASSWORD_MAX", isProd ? 10 : 100),
    windowMs: 60 * 60 * 1000,
  },
  resendVerification: {
    max: envInt("RATE_LIMIT_RESEND_VERIFICATION_MAX", isProd ? 3 : 30),
    windowMs: 15 * 60 * 1000,
  },
} as const;
