import { z } from "zod";

const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

export const creatorProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or less"),
  bio: z
    .string()
    .max(2000, "Bio must be 2000 characters or less")
    .optional()
    .or(z.literal("")),
  profilePhotoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
  spotifyUrl: optionalUrl,
  facebookUrl: optionalUrl,
});

export type CreatorProfileFormData = z.infer<typeof creatorProfileSchema>;
