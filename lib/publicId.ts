/**
 * Short, human-readable ID for memberships.
 * Example: MSP-8F42A1
 *
 * Uses an alphabet that omits ambiguous characters (0/O, 1/I/L)
 * so it's easy to read aloud or type.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePublicId(): string {
  let out = "MSP-";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}