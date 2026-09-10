import { z } from "zod";

export const createAccessRequestSchema = z
  .object({
    membershipId: z.string().uuid(),
    requestedStartTime: z.string().datetime().optional(),
    requestedEndTime: z.string().datetime().optional(),
    requestedUnits: z.number().int().min(1).max(50).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      (data.requestedStartTime && data.requestedEndTime) ||
      data.requestedUnits,
    {
      message:
        "Provide either a start/end time (time-based access) or a unit count (quantity-based benefit).",
    }
  );
