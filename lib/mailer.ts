const APP_URL = process.env.APPLICATION_URL || "http://localhost:3000";

/**
 * STUB: this sandbox has no network access to any email provider, so
 * "sending" an email just logs the link to the server console instead.
 * The calling code is written the way it would be with a real provider —
 * swap the console.log for e.g. `resend.emails.send(...)` and nothing
 * else needs to change.
 */
export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  console.log(`[mailer stub] Verification email to ${to}: ${link}`);
  return { link };
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  console.log(`[mailer stub] Password reset email to ${to}: ${link}`);
  return { link };
}
