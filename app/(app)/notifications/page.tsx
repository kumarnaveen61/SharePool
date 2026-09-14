import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  NotificationList,
  type NotificationRow,
} from "@/components/NotificationList";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const initial: NotificationRow[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    relatedMembershipId: n.relatedMembershipId,
    relatedAccessRequestId: n.relatedAccessRequestId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-muted">
          Activity from your SharePool network.
        </p>
      </div>

      <NotificationList initial={initial} />
    </div>
  );
}