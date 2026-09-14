import { db } from "@/lib/db";
import { groupMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession, type SessionPayload } from "./session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Every protected API route must call this first. Never trust a userId,
 * groupId, or role passed in the request body — always re-derive identity
 * from the signed session cookie server-side.
 *
 * Also checks the token's sessionVersion against the current value in the
 * database. A password change or "log out everywhere" bumps that column,
 * which instantly invalidates every previously-issued JWT — even ones
 * that haven't expired yet — without needing a server-side session store.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("You must be signed in.", 401);
  }

  const [user] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.sessionVersion !== session.sessionVersion) {
    throw new AuthError("Your session has expired. Please sign in again.", 401);
  }

  return session;
}

/**
 * Confirms the current user actually belongs to the given group, and
 * returns their membership row (including role). Throws 403 otherwise.
 * This is the check that prevents cross-group data access (IDOR).
 */
export async function requireGroupMembership(
  userId: string,
  groupId: string
) {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    )
    .limit(1);

  if (!membership) {
    throw new AuthError("You do not have access to this group.", 403);
  }
  if (membership.suspended) {
    throw new AuthError("Your access to this group has been suspended.", 403);
  }
  return membership;
}

export function requireGroupAdmin(membership: { role: string }) {
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new AuthError("This action requires group admin permissions.", 403);
  }
}

export function requireSuperAdmin(session: SessionPayload) {
  if (session.role !== "SUPER_ADMIN") {
    throw new AuthError("This action requires platform admin permissions.", 403);
  }
}
