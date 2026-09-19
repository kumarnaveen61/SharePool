import { db } from "@/lib/db";
import {
  pendingProviders,
  providerCatalog,
  users,
} from "@/lib/db/schema";
import { requireUser, requireSuperAdmin } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { notify } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().trim().max(1000).optional(),
});

export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireUser();
    requireSuperAdmin(session);
    const { id } = await ctx.params;

    const body = await req.json();
    const data = schema.parse(body);

    const [pending] = await db
      .select()
      .from(pendingProviders)
      .where(eq(pendingProviders.id, id))
      .limit(1);

    if (!pending) {
      return fail("NOT_FOUND", "Suggestion not found.", 404);
    }

    if (pending.status !== "PENDING") {
      return fail("ALREADY_REVIEWED", "This was already reviewed.", 409);
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(pendingProviders)
        .set({
          status: data.action === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewedBy: session.userId,
          reviewedAt: now,
          adminNotes: data.adminNotes,
        })
        .where(eq(pendingProviders.id, id));

      if (data.action === "APPROVE") {
        await tx
          .insert(providerCatalog)
          .values({
            category: pending.category,
            name: pending.suggestedName,
            createdBy: session.userId,
          })
          .onConflictDoNothing();
      }
    });

    await notify({
      userId: pending.submittedBy,
      type: "MEMBERSHIP_AVAILABLE",
      title:
        data.action === "APPROVE"
          ? `"${pending.suggestedName}" is now available`
          : `"${pending.suggestedName}" was not approved`,
      body:
        data.action === "APPROVE"
          ? `Your suggested provider is now in the ${pending.category.replace(/_/g, " ")} category.`
          : data.adminNotes || "The admin reviewed your suggestion but did not add it.",
    });

    await logActivity({
      actorId: session.userId,
      action:
        data.action === "APPROVE"
          ? "PROVIDER_APPROVED"
          : "PROVIDER_REJECTED",
      entityType: "provider",
      metadata: {
        name: pending.suggestedName,
        category: pending.category,
      },
    });

    return ok({ reviewed: true });
  }
);
