import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  memberLimit: z.number().int().min(2).max(20).optional(),
  rules: z.string().trim().max(2000).optional(),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4).max(12),
});

export const membershipCategoryValues = [
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
] as const;

export const sharingEligibilityValues = [
  "OFFICIALLY_SHAREABLE",
  "OWNER_ASSISTED",
  "TRANSFERABLE_BENEFIT",
  "NOT_SHAREABLE",
] as const;

export const createMembershipSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  category: z.enum(membershipCategoryValues),
  provider: z.string().trim().max(120).optional(),
  planName: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  sharingEligibility: z.enum(sharingEligibilityValues),
  maxSimultaneousUsers: z.number().int().min(1).max(20).optional(),
  totalUnits: z.number().int().min(1).optional(), // for quantity-based benefits
  expiryDate: z.string().datetime().optional(),
  renewalDate: z.string().datetime().optional(),
});

export const setAvailabilitySchema = z.object({
  membershipId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});
