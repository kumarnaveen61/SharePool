import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.CREDENTIAL_ENCRYPTION_KEY;

if (!KEY_HEX) {
  throw new Error(
    "CREDENTIAL_ENCRYPTION_KEY is not set. Add a 64-char hex string to .env."
  );
}

const keyBuffer = Buffer.from(KEY_HEX, "hex");

if (keyBuffer.length !== 32) {
  throw new Error(
    "CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (64 hex characters)."
  );
}

/**
 * AES-256-GCM. Ciphertext and auth tag are concatenated and base64-encoded.
 * IV is random per-encryption and stored alongside.
 */
export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([encrypted, authTag]);
  return {
    ciphertext: combined.toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decrypt(ciphertext: string, ivB64: string): string {
  const iv = Buffer.from(ivB64, "base64");
  const combined = Buffer.from(ciphertext, "base64");
  const authTag = combined.subarray(-16);
  const encrypted = combined.subarray(0, -16);
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(authTag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString("utf8");
}

/** Convenience: encrypt a JSON-serializable object. */
export function encryptJson(obj: unknown): { ciphertext: string; iv: string } {
  return encrypt(JSON.stringify(obj));
}

/** Convenience: decrypt to a parsed object. */
export function decryptJson<T = unknown>(ciphertext: string, ivB64: string): T {
  return JSON.parse(decrypt(ciphertext, ivB64)) as T;
}