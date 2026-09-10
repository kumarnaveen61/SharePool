import { z } from "zod";

export const createReportSchema = z
  .object({
    groupId: z.string().uuid(),
    targetType: z.enum(["USER", "MEMBERSHIP"]),
    targetUserId: z.string().uuid().optional(),
    targetMembershipId: z.string().uuid().optional(),
    reason: z.string().trim().min(5, "Please give a bit more detail.").max(1000),
  })
  .refine(
    (data) =>
      (data.targetType === "USER" && data.targetUserId) ||
      (data.targetType === "MEMBERSHIP" && data.targetMembershipId),
    { message: "targetUserId or targetMembershipId is required, matching targetType." }
  );

export const resolveReportSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED", "ACTIONED"]),
  adminNotes: z.string().trim().max(1000).optional(),
});
