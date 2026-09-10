import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AuthError } from "@/lib/auth/guards";
import { ZodError } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        requestId: randomUUID(),
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

/** Wraps a route handler so unexpected errors never leak internals to the client. */
export function withErrorHandling(
  handler: (req: Request, ctx: any) => Promise<Response>
) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return fail("UNAUTHORIZED", err.message, err.status);
      }
      if (err instanceof ZodError) {
        return fail(
          "VALIDATION_ERROR",
          "The request contained invalid data.",
          422,
          err.flatten()
        );
      }
      // Never leak stack traces, DB errors, or file paths to the client.
      console.error("[API ERROR]", err);
      return fail(
        "INTERNAL_ERROR",
        "Something went wrong. Please try again.",
        500
      );
    }
  };
}

/**
 * For auth endpoints prone to abuse (login, register, password reset).
 * Rate-limits by IP and, when an email is present in the request, by email
 * too — so an attacker can't get around a per-email limit just by
 * rotating IPs, or spray-guess across many accounts from one IP. Returns
 * a 429 response if either limit is hit, or null to let the caller
 * proceed.
 */
export function rateLimitOrNull(
  req: Request,
  routeName: string,
  email: string | undefined,
  limit: number,
  windowMs: number
): Response | null {
  const ip = getClientIp(req);
  const ipResult = checkRateLimit(`${routeName}:ip:${ip}`, limit, windowMs);
  if (!ipResult.allowed) {
    return fail(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${ipResult.retryAfterSeconds}s.`,
      429
    );
  }

  if (email) {
    const emailResult = checkRateLimit(`${routeName}:email:${email}`, limit, windowMs);
    if (!emailResult.allowed) {
      return fail(
        "RATE_LIMITED",
        `Too many attempts. Try again in ${emailResult.retryAfterSeconds}s.`,
        429
      );
    }
  }

  return null;
}
