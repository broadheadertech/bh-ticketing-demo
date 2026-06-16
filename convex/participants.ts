import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization", "admin", "venue_manager"];

// The signed-in creator's roster (for the lineup picker).
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const rows = await ctx.db
      .query("participants")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return rows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        _id: p._id,
        name: p.name,
        role: p.role ?? null,
        bio: p.bio ?? null,
        linkUrl: p.linkUrl ?? null,
      }));
  },
});

export const update = mutation({
  args: {
    id: v.id("participants"),
    name: v.string(),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) throw new ConvexError("Participant not found");
    if (p.ownerId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("Not your participant");
    }
    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required");
    await ctx.db.patch(args.id, {
      name,
      role: args.role?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      linkUrl: args.linkUrl?.trim() || undefined,
      updatedAt: Date.now(),
    });
  },
});

// Add a participant to the caller's roster (used by the "add on the fly" flow).
export const create = mutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
    bio: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required");
    if (name.length > 120) throw new ConvexError("Name too long");
    const now = Date.now();
    return await ctx.db.insert("participants", {
      ownerId: user._id,
      name,
      role: args.role?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      linkUrl: args.linkUrl?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("participants") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) return;
    if (p.ownerId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("Not your participant");
    }
    await ctx.db.delete(args.id);
  },
});
