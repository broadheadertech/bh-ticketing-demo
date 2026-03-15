import { z } from "zod";

export const AVAILABILITY_STATUSES = ["available", "tentative", "booked"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const setAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format — expected YYYY-MM-DD"),
  status: z.enum(AVAILABILITY_STATUSES),
  notes: z.string().max(500, "Notes must be 500 characters or less").optional(),
});

export type SetAvailabilityFormData = z.infer<typeof setAvailabilitySchema>;
