import { db } from "@/lib/db";
import { ratings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Average star rating for a user, plus how many ratings it's based on.
 * Returns null average when there's nothing to average yet, so the UI can
 * show "No ratings yet" instead of a misleading 0.0.
 */
export async function getTrustScore(userId: string) {
  const [row] = await db
    .select({
      average: sql<number | null>`avg(${ratings.stars})`,
      count: sql<number>`count(*)`,
    })
    .from(ratings)
    .where(eq(ratings.rateeId, userId));

  return {
    average: row?.average ? Number(row.average) : null,
    count: row?.count ? Number(row.count) : 0,
  };
}
