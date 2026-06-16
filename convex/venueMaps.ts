import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole, requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["organization", "venue_manager", "artist", "admin"];

// List maps for the editor.
//  - kind "template": shared admin blueprints (any creator can read to seed from)
//  - kind "venue":    the caller's own venue maps
export const list = query({
  args: { kind: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const rows =
      args.kind === "template"
        ? await ctx.db
            .query("venueMaps")
            .withIndex("by_kind", (q) => q.eq("kind", "template"))
            .collect()
        : (
            await ctx.db
              .query("venueMaps")
              .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
              .collect()
          ).filter((m) => m.kind === "venue");

    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((m) => ({
        _id: m._id,
        name: m.name,
        kind: m.kind,
        data: m.data,
        capacity: m.capacity,
        updatedAt: m.updatedAt,
      }));
  },
});

// Create or update a map. Templates require admin; venue maps require a creator role.
export const save = mutation({
  args: {
    id: v.optional(v.id("venueMaps")),
    kind: v.string(),
    name: v.string(),
    data: v.any(),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (args.kind === "template") requireRole(user, "admin");
    else requireAnyRole(user, CREATOR_ROLES);

    const now = Date.now();
    const name = args.name.trim() || (args.kind === "template" ? "Untitled template" : "Untitled map");

    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new ConvexError("Map not found");
      if (existing.ownerId !== user._id && !user.roles.includes("admin")) {
        throw new ConvexError("You do not own this map");
      }
      await ctx.db.patch(args.id, { name, data: args.data, capacity: args.capacity, updatedAt: now });
      return args.id;
    }

    return await ctx.db.insert("venueMaps", {
      ownerId: user._id,
      kind: args.kind,
      name,
      data: args.data,
      capacity: args.capacity,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("venueMaps") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    if (existing.ownerId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("You do not own this map");
    }
    await ctx.db.delete(args.id);
  },
});
