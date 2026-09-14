import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type NotificationInput = {
  userId: string;
  type:
    | "REQUEST_RECEIVED"
    | "REQUEST_APPROVED"
    | "REQUEST_REJECTED"
    | "REQUEST_CANCELLED"
    | "SESSION_ENDING_SOON"
    | "SESSION_COMPLETED"
    | "MEMBERSHIP_AVAILABLE"
    | "MEMBERSHIP_EXPIRING"
    | "CREDITS_RECEIVED"
    | "MEMBERSHIP_REMOVED_BY_ADMIN"
    | "SUSPENDED_BY_ADMIN"
    | "REMOVED_FROM_GROUP";
  title: string;
  body?: string;
  relatedMembershipId?: string;
  relatedAccessRequestId?: string;
};

/**
 * Fire-and-forget in-app notification. Never throws into the caller's
 * request/response flow — a notification failing to write should not fail
 * the underlying action (e.g. approving a request should still succeed
 * even if the notification insert has a problem).
 */
export async function notify(input: NotificationInput) {
  try {
    await db.insert(notifications).values(input);
  } catch (err) {
    console.error("[notify] failed to write notification", err);
  }
}
