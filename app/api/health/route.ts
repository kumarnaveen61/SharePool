import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { count } from "drizzle-orm";

const startedAt = Date.now();

/**
 * Public, unauthenticated health check — this is what a load balancer or
 * uptime monitor hits, so it deliberately reveals nothing about internal
 * state beyond "is the app able to reach its database right now."
 */
export async function GET() {
  let databaseOk = true;
  try {
    await db.select({ value: count() }).from(users).limit(1);
  } catch (err) {
    console.error("[health] database check failed", err);
    databaseOk = false;
  }

  return NextResponse.json(
    {
      status: databaseOk ? "healthy" : "degraded",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
    { status: databaseOk ? 200 : 503 }
  );
}
