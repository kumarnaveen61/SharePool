import { randomBytes } from "crypto";

export const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30; // 30 minutes

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
