import { z } from "zod";
import { EVENT_TYPES } from "@/lib/utils/constants";

export const eventTypeSchema = z.enum(EVENT_TYPES);

export type EventType = z.infer<typeof eventTypeSchema>;

export const eventThemeSchema = z.enum([
  "aurora",
  "grandprix",
  "cosmic",
  "tropical",
  "fiesta",
]);

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
  theme: eventThemeSchema.optional(),
  lineupArtistIds: z.array(z.string()).max(20, "At most 20 artists").optional(),
  // Extended fields (all optional). Times validated as HH:mm when present.
  tagline: z.string().max(140, "Tagline must be 140 characters or less").optional().or(z.literal("")),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm").optional().or(z.literal("")),
  doorsTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm").optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  locationType: z.enum(["venue", "online", "hybrid"]).optional(),
  onlineUrl: z.string().max(300).optional().or(z.literal("")),
  onSaleStart: z.string().optional().or(z.literal("")),
  onSaleEnd: z.string().optional().or(z.literal("")),
  maxPerOrder: z.string().optional().or(z.literal("")),
  visibility: z.enum(["public", "unlisted"]).optional(),
  refundPolicy: z.string().max(1000).optional().or(z.literal("")),
  ageRestriction: z.string().max(100).optional().or(z.literal("")),
  goodToKnow: z.string().max(2000).optional().or(z.literal("")),
});

export type EventDetailsFormData = z.infer<typeof eventDetailsSchema>;

export const createEventSchema = z.object({
  eventType: eventTypeSchema,
  title: eventDetailsSchema.shape.title,
  description: eventDetailsSchema.shape.description,
  date: eventDetailsSchema.shape.date,
  time: eventDetailsSchema.shape.time,
  venueName: eventDetailsSchema.shape.venueName,
  theme: eventDetailsSchema.shape.theme,
  lineupArtistIds: eventDetailsSchema.shape.lineupArtistIds,
});

export type CreateEventFormData = z.infer<typeof createEventSchema>;
