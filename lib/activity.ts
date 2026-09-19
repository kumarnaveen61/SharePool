import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

type ActivityInput = {
  groupId?: string | null;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget activity logger. Never throws into the caller's request —
 * activity logging failing should never break the underlying action.
 */
export async function logActivity(input: ActivityInput) {
  try {
    await db.insert(activityLogs).values({
      groupId: input.groupId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  } catch (err) {
    console.error("[logActivity] failed", err);
  }
}