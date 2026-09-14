import { db } from "@/lib/db";
import { adminActions } from "@/lib/db/schema";

type AdminActionInput = {
  groupId: string;
  adminId: string;
  action:
    | "REMOVE_MEMBER"
    | "SUSPEND_MEMBER"
    | "UNSUSPEND_MEMBER"
    | "REMOVE_MEMBERSHIP"
    | "UPDATE_GROUP_SETTINGS"
    | "RESOLVE_REPORT";
  targetUserId?: string;
  targetMembershipId?: string;
  targetReportId?: string;
  reason?: string;
};

/**
 * Every admin action must leave an audit trail — "Admin should never
 * silently modify [state]" from the spec. Call this inside the same
 * transaction as the action it's logging wherever possible.
 */
export async function logAdminAction(input: AdminActionInput) {
  await db.insert(adminActions).values(input);
}
