import { db } from "@/lib/db";
import { memberships, membershipCredentials } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { encryptJson } from "@/lib/credentials/crypto";
import {
  credentialPayloadSchemas,
  upsertCredentialSchema,
  type CredentialType,
} from "@/lib/credentials/types";
import { and, eq } from "drizzle-orm";

/** GET — owner reads their own credential config (no decrypted payload). */
export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;

    const [m] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.ownerId, session.userId)
        )
      )
      .limit(1);

    if (!m) return fail("NOT_FOUND", "Membership not found.", 404);

    const [cred] = await db
      .select({
        id: membershipCredentials.id,
        type: membershipCredentials.type,
        instructions: membershipCredentials.instructions,
        voucherExpiresAt: membershipCredentials.voucherExpiresAt,
        voucherRedeemUrl: membershipCredentials.voucherRedeemUrl,
        voucherUsedAt: membershipCredentials.voucherUsedAt,
        updatedAt: membershipCredentials.updatedAt,
        hasEncryptedPayload: membershipCredentials.encryptedPayload,
      })
      .from(membershipCredentials)
      .where(eq(membershipCredentials.membershipId, membershipId))
      .limit(1);

    return ok({
      credential: cred
        ? {
            ...cred,
            hasEncryptedPayload: !!cred.hasEncryptedPayload,
          }
        : null,
    });
  }
);

/** POST — owner creates or replaces the credential config for a membership. */
export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;

    const [m] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.ownerId, session.userId)
        )
      )
      .limit(1);

    if (!m) return fail("NOT_FOUND", "Membership not found.", 404);

    const body = await req.json();
    const data = upsertCredentialSchema.parse(body);
    const type = data.type as CredentialType;

    // Encrypt only if the type has a payload
    let ciphertext: string | null = null;
    let iv: string | null = null;

    if (type !== "EMAIL_INVITE" && type !== "OWNER_ACTION") {
      const schema = credentialPayloadSchemas[type];
      const parsed = schema.parse(data.payload ?? {});
      const enc = encryptJson(parsed);
      ciphertext = enc.ciphertext;
      iv = enc.iv;
    }

    // Upsert: delete-then-insert (simpler than onConflict here)
    await db
      .delete(membershipCredentials)
      .where(eq(membershipCredentials.membershipId, membershipId));

    const [created] = await db
      .insert(membershipCredentials)
      .values({
        membershipId,
        type,
        encryptedPayload: ciphertext,
        iv,
        instructions: data.instructions,
        voucherExpiresAt: data.voucherExpiresAt
          ? new Date(data.voucherExpiresAt)
          : undefined,
        voucherRedeemUrl: data.voucherRedeemUrl,
      })
      .returning({ id: membershipCredentials.id, type: membershipCredentials.type });

    return ok({ credential: created }, 201);
  }
);

/** DELETE — owner removes the credential config. */
export const DELETE = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    const { id: membershipId } = await ctx.params;

    const [m] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.id, membershipId),
          eq(memberships.ownerId, session.userId)
        )
      )
      .limit(1);

    if (!m) return fail("NOT_FOUND", "Membership not found.", 404);

    await db
      .delete(membershipCredentials)
      .where(eq(membershipCredentials.membershipId, membershipId));

    return ok({ deleted: true });
  }
);