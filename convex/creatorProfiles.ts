import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  getAuthenticatedUser,
  getOptionalAuthenticatedUser,
} from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuthenticatedUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

function validateUrl(value: string, fieldName: string): void {
  if (value === "") return;
  try {
    new URL(value);
  } catch {
    throw new ConvexError(`${fieldName} must be a valid URL`);
  }
}

export const upsertProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.optional(v.string()),
    profilePhotoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, ["artist", "organization"]);

    // Validate displayName
    const displayName = args.displayName.trim();
    if (!displayName) {
      throw new ConvexError("Display name is required");
    }
    if (displayName.length > 100) {
      throw new ConvexError("Display name must be 100 characters or less");
    }

    // Validate bio length
    if (args.bio && args.bio.length > 2000) {
      throw new ConvexError("Bio must be 2000 characters or less");
    }

    // Validate URLs
    if (args.profilePhotoUrl) validateUrl(args.profilePhotoUrl, "Profile photo URL");
    if (args.websiteUrl) validateUrl(args.websiteUrl, "Website URL");
    if (args.instagramUrl) validateUrl(args.instagramUrl, "Instagram URL");
    if (args.spotifyUrl) validateUrl(args.spotifyUrl, "Spotify URL");
    if (args.facebookUrl) validateUrl(args.facebookUrl, "Facebook URL");

    const now = Date.now();
    const existing = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .unique();

    const profileData = {
      displayName,
      bio: args.bio,
      profilePhotoUrl: args.profilePhotoUrl,
      websiteUrl: args.websiteUrl,
      instagramUrl: args.instagramUrl,
      spotifyUrl: args.spotifyUrl,
      facebookUrl: args.facebookUrl,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...profileData,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("creatorProfiles", {
      userId: user._id,
      ...profileData,
      createdAt: now,
      updatedAt: now,
    });
  },
});
