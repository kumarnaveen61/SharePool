import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "USER",
  "GROUP_ADMIN",
  "SUPER_ADMIN",
]);

export const groupMemberRoleEnum = pgEnum("group_member_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);

export const membershipCategoryEnum = pgEnum("membership_category", [
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
]);

// How the benefit may legitimately be shared. This is the field the whole
// product concept hinges on: it must always be explicit, and "NOT_SHAREABLE"
// must always be enforced server-side (never just hidden in the UI).
export const sharingEligibilityEnum = pgEnum("sharing_eligibility", [
  "OFFICIALLY_SHAREABLE", // 🟢 provider explicitly permits (family plan, official multi-user)
  "OWNER_ASSISTED", // 🟡 owner performs the action on the requester's behalf
  "TRANSFERABLE_BENEFIT", // 🔵 a voucher/credit/benefit that can be handed to another member
  "NOT_SHAREABLE", // 🔴 must never be offered for sharing
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "AVAILABLE",
  "IN_USE",
  "UNAVAILABLE",
  "SCHEDULED",
  "PENDING_APPROVAL",
]);

export const accessRequestStatusEnum = pgEnum("access_request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const accessSessionStatusEnum = pgEnum("access_session_status", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "REQUEST_RECEIVED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "REQUEST_CANCELLED",
  "SESSION_ENDING_SOON",
  "SESSION_COMPLETED",
  "MEMBERSHIP_AVAILABLE",
  "MEMBERSHIP_EXPIRING",
  "CREDITS_RECEIVED",
  "MEMBERSHIP_REMOVED_BY_ADMIN",
  "SUSPENDED_BY_ADMIN",
  "REMOVED_FROM_GROUP",
]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "USER",
  "MEMBERSHIP",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "OPEN",
  "REVIEWED",
  "DISMISSED",
  "ACTIONED",
]);

export const adminActionTypeEnum = pgEnum("admin_action_type", [
  "REMOVE_MEMBER",
  "SUSPEND_MEMBER",
  "UNSUSPEND_MEMBER",
  "REMOVE_MEMBERSHIP",
  "UPDATE_GROUP_SETTINGS",
  "RESOLVE_REPORT",
]);

// ─────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("USER"),
  emailVerified: boolean("email_verified").notNull().default(false),
  // Bumped on password change / "log out everywhere" — embedded in every
  // JWT, so incrementing this instantly invalidates all previously-issued
  // sessions without needing a server-side session store.
  sessionVersion: integer("session_version").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

// ─────────────────────────────────────────────────────────
// AUTH TOKENS (email verification, password reset) — Phase 5
// ─────────────────────────────────────────────────────────

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("verification_tokens_token_idx").on(table.token),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("password_reset_tokens_token_idx").on(table.token),
}));

// ─────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  inviteCode: varchar("invite_code", { length: 12 }).notNull(),
  memberLimit: integer("member_limit").notNull().default(20),
  rules: text("rules"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  inviteCodeIdx: uniqueIndex("groups_invite_code_idx").on(table.inviteCode),
  ownerIdx: index("groups_owner_id_idx").on(table.ownerId),
}));

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: groupMemberRoleEnum("role").notNull().default("MEMBER"),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  suspended: boolean("suspended").notNull().default(false),
}, (table) => ({
  groupUserIdx: uniqueIndex("group_members_group_user_idx").on(
    table.groupId,
    table.userId
  ),
  groupIdx: index("group_members_group_id_idx").on(table.groupId),
  userIdx: index("group_members_user_id_idx").on(table.userId),
}));

// ─────────────────────────────────────────────────────────
// MEMBERSHIPS
// ─────────────────────────────────────────────────────────

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  category: membershipCategoryEnum("category").notNull(),
  provider: varchar("provider", { length: 120 }),
  planName: varchar("plan_name", { length: 120 }),
  description: text("description"),
  sharingEligibility: sharingEligibilityEnum("sharing_eligibility")
    .notNull()
    .default("OWNER_ASSISTED"),
  status: membershipStatusEnum("status").notNull().default("UNAVAILABLE"),
  maxSimultaneousUsers: integer("max_simultaneous_users").notNull().default(1),
  totalUnits: integer("total_units"), // for quantity-based benefits (e.g. 2 lounge visits)
  remainingUnits: integer("remaining_units"), // null = not a quantity-based benefit
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  renewalDate: timestamp("renewal_date", { withTimezone: true }),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupIdx: index("memberships_group_id_idx").on(table.groupId),
  ownerIdx: index("memberships_owner_id_idx").on(table.ownerId),
  statusIdx: index("memberships_status_idx").on(table.status),
  categoryIdx: index("memberships_category_idx").on(table.category),
}));

// Availability windows an owner sets for a membership (Phase 1: simple
// one-off or repeating-day windows; Phase 4 later adds full recurrence rules).
export const membershipAvailability = pgTable("membership_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 if this is a recurring weekly slot, else null
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  membershipIdx: index("membership_availability_membership_id_idx").on(
    table.membershipId
  ),
  startTimeIdx: index("membership_availability_start_time_idx").on(
    table.startTime
  ),
}));

// ─────────────────────────────────────────────────────────
// ACCESS REQUESTS & SESSIONS (Phase 2)
// ─────────────────────────────────────────────────────────

// A member asking to use someone else's membership/benefit for a window
// of time (or, for quantity-based benefits, for N units).
export const accessRequests = pgTable("access_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: accessRequestStatusEnum("status").notNull().default("PENDING"),
  requestedStartTime: timestamp("requested_start_time", { withTimezone: true }),
  requestedEndTime: timestamp("requested_end_time", { withTimezone: true }),
  requestedUnits: integer("requested_units"), // for quantity-based benefits
  reason: text("reason"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  membershipIdx: index("access_requests_membership_id_idx").on(
    table.membershipId
  ),
  requesterIdx: index("access_requests_requester_id_idx").on(
    table.requesterId
  ),
  ownerIdx: index("access_requests_owner_id_idx").on(table.ownerId),
  statusIdx: index("access_requests_status_idx").on(table.status),
}));

// Created only once a request is approved. This is the "who actually got
// to use what, and when" audit trail.
export const accessSessions = pgTable("access_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accessRequestId: uuid("access_request_id")
    .notNull()
    .references(() => accessRequests.id, { onDelete: "cascade" }),
  membershipId: uuid("membership_id")
    .notNull()
    .references(() => memberships.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  units: integer("units"), // for quantity-based benefits
  status: accessSessionStatusEnum("status").notNull().default("ACTIVE"),
  approvedAt: timestamp("approved_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  membershipIdx: index("access_sessions_membership_id_idx").on(
    table.membershipId
  ),
  requesterIdx: index("access_sessions_requester_id_idx").on(
    table.requesterId
  ),
  statusIdx: index("access_sessions_status_idx").on(table.status),
  endTimeIdx: index("access_sessions_end_time_idx").on(table.endTime),
}));

// One rating per completed session, by the requester only — prevents an
// owner from rating their own membership's use.
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  accessSessionId: uuid("access_session_id")
    .notNull()
    .references(() => accessSessions.id, { onDelete: "cascade" }),
  raterId: uuid("rater_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rateeId: uuid("ratee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  sessionIdx: uniqueIndex("ratings_session_id_idx").on(table.accessSessionId),
  rateeIdx: index("ratings_ratee_id_idx").on(table.rateeId),
}));

// ─────────────────────────────────────────────────────────
// POOL CREDITS (Phase 2 — non-cash participation ledger)
// ─────────────────────────────────────────────────────────

export const poolCredits = pgTable("pool_credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupUserIdx: uniqueIndex("pool_credits_group_user_idx").on(
    table.groupId,
    table.userId
  ),
}));

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // positive or negative
  reason: varchar("reason", { length: 80 }).notNull(), // e.g. MEMBERSHIP_CONTRIBUTED, BENEFIT_USED
  relatedAccessSessionId: uuid("related_access_session_id").references(
    () => accessSessions.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupUserIdx: index("credit_transactions_group_user_idx").on(
    table.groupId,
    table.userId
  ),
}));

// ─────────────────────────────────────────────────────────
// NOTIFICATIONS (Phase 2)
// ─────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  relatedMembershipId: uuid("related_membership_id").references(
    () => memberships.id,
    { onDelete: "set null" }
  ),
  relatedAccessRequestId: uuid("related_access_request_id").references(
    () => accessRequests.id,
    { onDelete: "set null" }
  ),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  userIdx: index("notifications_user_id_idx").on(table.userId),
  userUnreadIdx: index("notifications_user_unread_idx").on(
    table.userId,
    table.isRead
  ),
}));

// ─────────────────────────────────────────────────────────
// SAFETY: REPORTS & BLOCKS (Phase 4)
// ─────────────────────────────────────────────────────────

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  reportedBy: uuid("reported_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetUserId: uuid("target_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  targetMembershipId: uuid("target_membership_id").references(
    () => memberships.id,
    { onDelete: "cascade" }
  ),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("OPEN"),
  adminNotes: text("admin_notes"),
  resolvedBy: uuid("resolved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupIdx: index("reports_group_id_idx").on(table.groupId),
  statusIdx: index("reports_status_idx").on(table.status),
}));

// A blocks B: A no longer wants to see B's memberships, or receive
// requests from B, within a shared group. One-directional by design —
// blocking is a personal safety tool, not a mutual "unfriend".
export const blockedUsers = pgTable("blocked_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  blockerId: uuid("blocker_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedId: uuid("blocked_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  uniqueBlock: uniqueIndex("blocked_users_unique_idx").on(
    table.groupId,
    table.blockerId,
    table.blockedId
  ),
}));

export const adminActions = pgTable("admin_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: adminActionTypeEnum("action").notNull(),
  targetUserId: uuid("target_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  targetMembershipId: uuid("target_membership_id").references(
    () => memberships.id,
    { onDelete: "set null" }
  ),
  targetReportId: uuid("target_report_id").references(() => reports.id, {
    onDelete: "set null",
  }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupIdx: index("admin_actions_group_id_idx").on(table.groupId),
}));

// ─────────────────────────────────────────────────────────
// LAUNCH CHECKLIST (Phase 6)
// ─────────────────────────────────────────────────────────

export const launchChecklistItems = pgTable("launch_checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 60 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  notes: text("notes"),
  isDone: boolean("is_done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────────────────
// ACTIVITY LOG (append-only audit trail; reused/extended in later phases)
// ─────────────────────────────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  actorId: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: uuid("entity_id"),
  metadata: text("metadata"), // JSON-encoded extra context
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  groupIdx: index("activity_logs_group_id_idx").on(table.groupId),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

// ─────────────────────────────────────────────────────────
// RELATIONS (for Drizzle's relational query API)
// ─────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  ownedGroups: many(groups),
  memberships: many(memberships),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, { fields: [groups.ownerId], references: [users.id] }),
  members: many(groupMembers),
  memberships: many(memberships),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const membershipsRelations = relations(
  memberships,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [memberships.groupId],
      references: [groups.id],
    }),
    owner: one(users, {
      fields: [memberships.ownerId],
      references: [users.id],
    }),
    availability: many(membershipAvailability),
  })
);

export const membershipAvailabilityRelations = relations(
  membershipAvailability,
  ({ one }) => ({
    membership: one(memberships, {
      fields: [membershipAvailability.membershipId],
      references: [memberships.id],
    }),
  })
);

export const accessRequestsRelations = relations(
  accessRequests,
  ({ one, many }) => ({
    membership: one(memberships, {
      fields: [accessRequests.membershipId],
      references: [memberships.id],
    }),
    requester: one(users, {
      fields: [accessRequests.requesterId],
      references: [users.id],
    }),
    owner: one(users, {
      fields: [accessRequests.ownerId],
      references: [users.id],
    }),
    sessions: many(accessSessions),
  })
);

export const accessSessionsRelations = relations(
  accessSessions,
  ({ one }) => ({
    accessRequest: one(accessRequests, {
      fields: [accessSessions.accessRequestId],
      references: [accessRequests.id],
    }),
    membership: one(memberships, {
      fields: [accessSessions.membershipId],
      references: [memberships.id],
    }),
    owner: one(users, {
      fields: [accessSessions.ownerId],
      references: [users.id],
    }),
    requester: one(users, {
      fields: [accessSessions.requesterId],
      references: [users.id],
    }),
  })
);
