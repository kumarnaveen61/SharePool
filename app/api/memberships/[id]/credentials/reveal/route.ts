import { db } from "@/lib/db";
import {
  accessSessions,
  memberships,
  membershipCredentials,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { decryptJson } from "@/lib/credentials/crypto";
import { and, eq } from "drizzle-orm";

/**
 * POST /api/memberships/[id]/credentials/reveal
 *
 * Returns the decrypted credential payload — but ONLY IF:
 *   • The caller is the requester of an ACTIVE access session for this
 *     membership, OR
 *   • The caller is the owner.
 */
export const POST = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;

    const [m] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .limit(1);

    if (!m) return fail("NOT_FOUND", "Membership not found.", 404);

    // 1) Ownership check
    if (m.ownerId === session.userId) {
      // owner — allowed
    } else {
      // 2) Check active session where caller is requester
      const [activeSession] = await db
        .select({ id: accessSessions.id })
        .from(accessSessions)
        .where(
          and(
            eq(accessSessions.membershipId, membershipId),
            eq(accessSessions.requesterId, session.userId),
            eq(accessSessions.status, "ACTIVE")
          )
        )
        .limit(1);

      if (!activeSession) {
        return fail(
          "NO_ACTIVE_ACCESS",
          "You don't have active access to this membership.",
          403
        );
      }
    }

    const [cred] = await db
      .select()
      .from(membershipCredentials)
      .where(eq(membershipCredentials.membershipId, membershipId))
      .limit(1);

    if (!cred) {
      return fail("NO_CREDENTIAL", "Owner hasn't set up access yet.", 404);
    }

    // Voucher already used?
    if (
      cred.type === "VOUCHER_CODE" &&
      cred.voucherUsedAt &&
      m.ownerId !== session.userId
    ) {
      return fail(
        "VOUCHER_USED",
        "This voucher has already been redeemed.",
        410
      );
    }

    // No encrypted payload → nothing to reveal (EMAIL_INVITE, OWNER_ACTION)
    if (!cred.encryptedPayload || !cred.iv) {
      return ok({
        type: cred.type,
        payload: null,
        instructions: cred.instructions,
        voucherExpiresAt: cred.voucherExpiresAt,
        voucherRedeemUrl: cred.voucherRedeemUrl,
      });
    }

    const payload = decryptJson<Record<string, unknown>>(
      cred.encryptedPayload,
      cred.iv
    );

    return ok({
      type: cred.type,
      payload,
      instructions: cred.instructions,
      voucherExpiresAt: cred.voucherExpiresAt,
      voucherRedeemUrl: cred.voucherRedeemUrl,
    });
  }
);