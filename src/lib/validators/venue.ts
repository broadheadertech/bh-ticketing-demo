import { z } from "zod";

export const createVenueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Venue name is required")
    .max(100, "Venue name must be 100 characters or less"),
  location: z
    .string()
    .trim()
    .min(1, "Location is required")
    .max(200, "Location must be 200 characters or less"),
  capacity: z.coerce
    .number({ error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity must be 100,000 or less"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .or(z.literal("")),
  amenities: z
    .array(z.string())
    .max(20, "Maximum 20 amenities"),
});

export type CreateVenueFormData = z.infer<typeof createVenueSchema>;
// Input type differs from output because `capacity` is coerced (z.coerce.number).
export type CreateVenueFormInput = z.input<typeof createVenueSchema>;
