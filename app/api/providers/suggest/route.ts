import { db } from "@/lib/db";
import {
  pendingProviders,
  providerCatalog,
  users,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/guards";
import { ok, fail, withErrorHandling } from "@/lib/api-response";
import { notify } from "@/lib/notifications";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  category: z.enum([
    "OTT",
    "MUSIC",
    "SHOPPING",
    "FOOD_DELIVERY",
    "PHARMACY",
    "HEALTHCARE",
    "TRAVEL",
    "AIRPORT_LOUNGE",
    "MOVIES",
    "FITNESS",
    "SOFTWARE",
    "EDUCATION",
    "HOTEL",
    "CREDIT_CARD_BENEFITS",
    "OTHER",
  ]),
  suggestedName: z.string().trim().min(2).max(120),
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireUser();
  const body = await req.json();
  const data = schema.parse(body);

  const [existing] = await db
    .select({ id: providerCatalog.id })
    .from(providerCatalog)
    .where(
      and(
        eq(providerCatalog.category, data.category),
        ilike(providerCatalog.name, data.suggestedName)
      )
    )
    .limit(1);

  if (existing) {
    return ok({ alreadyExists: true });
  }

  const [pending] = await db
    .select({ id: pendingProviders.id })
    .from(pendingProviders)
    .where(
      and(
        eq(pendingProviders.category, data.category),
        ilike(pendingProviders.suggestedName, data.suggestedName),
        eq(pendingProviders.status, "PENDING")
      )
    )
    .limit(1);

  if (pending) {
    return ok({ alreadyPending: true, id: pending.id });
  }

  const [created] = await db
    .insert(pendingProviders)
    .values({
      category: data.category,
      suggestedName: data.suggestedName,
      submittedBy: session.userId,
    })
    .returning();

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "SUPER_ADMIN"));

  const [submitter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type: "MEMBERSHIP_AVAILABLE",
      title: "New provider suggested",
      body: `${submitter?.name ?? "A user"} added "${data.suggestedName}" under ${data.category.replace(/_/g, " ")}. Review it in Admin → Providers.`,
    });
  }

  return ok({ id: created.id }, 201);
});
