import { z } from "zod";

export const createRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(500).optional(),
});
