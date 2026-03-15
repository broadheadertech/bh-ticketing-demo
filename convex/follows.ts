import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  getAuthenticatedUser,
  getOptionalAuthenticatedUser,
} from "./lib/auth";

const VALID_ENTITY_TYPES = ["creator", "venue"];

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const followEntity = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!VALID_ENTITY_TYPES.includes(args.entityType)) {
      throw new ConvexError(
        `Invalid entity type: ${args.entityType}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
      );
    }

    // Verify entity exists
    const entity = await ctx.db.get(args.entityId as never);
    if (!entity) {
      throw new ConvexError("Entity not found");
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_entity", (q) =>
        q
          .eq("followerId", user._id)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .unique();

    if (existing) throw new ConvexError("Already following");

    await ctx.db.insert("follows", {
      followerId: user._id,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: Date.now(),
    });
  },
});

export const unfollowEntity = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!VALID_ENTITY_TYPES.includes(args.entityType)) {
      throw new ConvexError(
        `Invalid entity type: ${args.entityType}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
      );
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_entity", (q) =>
        q
          .eq("followerId", user._id)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .unique();

    if (!existing) throw new ConvexError("Not following this entity");

    await ctx.db.delete(existing._id);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const isFollowing = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuthenticatedUser(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_entity", (q) =>
        q
          .eq("followerId", user._id)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .unique();

    return !!existing;
  },
});

export const getMyFollowing = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    return Promise.all(
      follows.map(async (f) => {
        let entityName = "Unknown";
        if (f.entityType === "creator") {
          const creator = await ctx.db.get(f.entityId as never);
          entityName = (creator as { name?: string } | null)?.name ?? "Unknown";
        } else if (f.entityType === "venue") {
          const venue = await ctx.db.get(f.entityId as never);
          entityName = (venue as { name?: string } | null)?.name ?? "Unknown";
        }
        return {
          entityType: f.entityType,
          entityId: f.entityId,
          entityName,
          createdAt: f.createdAt,
        };
      })
    );
  },
});

export const getFollowerCount = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .collect();

    return followers.length;
  },
});
