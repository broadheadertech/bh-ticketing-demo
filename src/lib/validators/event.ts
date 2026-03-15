import { z } from "zod";
import { EVENT_TYPES } from "@/lib/utils/constants";

export const eventTypeSchema = z.enum(EVENT_TYPES);

export type EventType = z.infer<typeof eventTypeSchema>;

export const eventDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
  date: z
    .string()
    .min(1, "Date is required")
    .refine(
      (val) => {
        // Parse as local midnight to avoid UTC timezone shift
        const d = new Date(val + "T00:00:00");
        if (isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      },
      { message: "Date must be today or in the future" }
    ),
  time: z
    .string()
    .min(1, "Time is required")
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  venueName: z
    .string()
    .max(200, "Venue name must be 200 characters or less")
    .optional()
    .or(z.literal("")),
});

export type EventDetailsFormData = z.infer<typeof eventDetailsSchema>;

export const createEventSchema = z.object({
  eventType: eventTypeSchema,
  title: eventDetailsSchema.shape.title,
  description: eventDetailsSchema.shape.description,
  date: eventDetailsSchema.shape.date,
  time: eventDetailsSchema.shape.time,
  venueName: eventDetailsSchema.shape.venueName,
});

export type CreateEventFormData = z.infer<typeof createEventSchema>;
