import { db } from "@/lib/db";
import { poolCredits, creditTransactions } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const CREDIT_RULES = {
  MEMBERSHIP_CONTRIBUTED: 10,
  BENEFIT_MADE_AVAILABLE: 2,
  BENEFIT_USED: -2,
} as const;

/**
 * Adjusts a user's Pool Credits balance for a group and records the
 * transaction. Uses an upsert so the first adjustment for a user in a
 * group creates their balance row. Must be called inside the same
 * transaction as the action that earns/spends the credit, so a failure
 * anywhere rolls back together.
 */
export async function adjustCredits(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    groupId: string;
    userId: string;
    amount: number;
    reason: keyof typeof CREDIT_RULES | string;
    relatedAccessSessionId?: string;
  }
) {
  await tx
    .insert(poolCredits)
    .values({
      groupId: params.groupId,
      userId: params.userId,
      balance: params.amount,
    })
    .onConflictDoUpdate({
      target: [poolCredits.groupId, poolCredits.userId],
      set: {
        balance: sql`${poolCredits.balance} + ${params.amount}`,
        updatedAt: new Date(),
      },
    });

  await tx.insert(creditTransactions).values({
    groupId: params.groupId,
    userId: params.userId,
    amount: params.amount,
    reason: params.reason,
    relatedAccessSessionId: params.relatedAccessSessionId,
  });
}

export async function getBalance(groupId: string, userId: string) {
  const [row] = await db
    .select()
    .from(poolCredits)
    .where(and(eq(poolCredits.groupId, groupId), eq(poolCredits.userId, userId)))
    .limit(1);
  return row?.balance ?? 0;
}
