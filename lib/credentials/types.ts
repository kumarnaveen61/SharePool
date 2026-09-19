import { z } from "zod";

export const credentialTypeValues = [
  "SHARED_PASSWORD",
  "PHONE_NUMBER",
  "MEMBER_ID",
  "VOUCHER_CODE",
  "EMAIL_INVITE",
  "OWNER_ACTION",
  "CUSTOM_TEXT",
] as const;

export type CredentialType = (typeof credentialTypeValues)[number];

export const credentialPayloadSchemas = {
  SHARED_PASSWORD: z.object({
    username: z.string().trim().min(1).max(200),
    password: z.string().min(1).max(300),
  }),
  PHONE_NUMBER: z.object({
    phone: z.string().trim().min(4).max(30),
    name: z.string().trim().max(120).optional(),
    otpRequired: z.boolean().optional(),
  }),
  MEMBER_ID: z.object({
    memberId: z.string().trim().min(1).max(120),
    name: z.string().trim().max(120).optional(),
  }),
  VOUCHER_CODE: z.object({
    code: z.string().trim().min(1).max(200),
  }),
  EMAIL_INVITE: z.object({}).passthrough(), // no encrypted fields
  OWNER_ACTION: z.object({}).passthrough(), // no encrypted fields
  CUSTOM_TEXT: z.object({
    text: z.string().trim().min(1).max(2000),
  }),
} as const;

export const credentialMeta = {
  SHARED_PASSWORD: {
    label: "Username & password",
    hint: "Netflix, Spotify, Prime — services where you log in.",
    emoji: "🔐",
  },
  PHONE_NUMBER: {
    label: "Phone number",
    hint: "Gym, pharmacy, restaurants — services that look up by phone.",
    emoji: "📱",
  },
  MEMBER_ID: {
    label: "Member ID",
    hint: "Loyalty cards, hotel programs, airline miles.",
    emoji: "🎫",
  },
  VOUCHER_CODE: {
    label: "Voucher code",
    hint: "One-time airport lounge, gift codes, discount codes.",
    emoji: "🎁",
  },
  EMAIL_INVITE: {
    label: "Email invite",
    hint: "Family plans where the provider sends an invite to the requester's email.",
    emoji: "✉️",
  },
  OWNER_ACTION: {
    label: "I'll do it myself",
    hint: "Credit card benefits, tickets — you perform the action.",
    emoji: "🤝",
  },
  CUSTOM_TEXT: {
    label: "Custom instructions",
    hint: "Anything else — write what the requester should know.",
    emoji: "📝",
  },
} as const;

export const upsertCredentialSchema = z.object({
  type: z.enum(credentialTypeValues),
  payload: z.record(z.string(), z.unknown()).optional(),
  instructions: z.string().trim().max(2000).optional(),
  voucherExpiresAt: z.string().datetime().optional(),
  voucherRedeemUrl: z.string().url().max(500).optional(),
});