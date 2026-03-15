import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
// Duplicated from src/lib/utils/constants.ts — Convex backend cannot import from src/
const MAX_TIERS_PER_EVENT = 10;

export const saveTiers = mutation({
  args: {
    eventId: v.id("events"),
    tiers: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        description: v.optional(v.string()),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    // Verify event exists and is owned by user
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new ConvexError("You do not own this event");
    }
    if (event.status !== "draft") {
      throw new ConvexError("Can only configure tiers for draft events");
    }

    // Validate tier count
    if (args.tiers.length === 0) {
      throw new ConvexError("At least one ticket tier is required");
    }
    if (args.tiers.length > MAX_TIERS_PER_EVENT) {
      throw new ConvexError(`Maximum ${MAX_TIERS_PER_EVENT} tiers per event`);
    }

    // Validate each tier
    for (const tier of args.tiers) {
      const name = tier.name.trim();
      if (!name || name.length > 100) {
        throw new ConvexError("Tier name must be between 1 and 100 characters");
      }
      if (!Number.isInteger(tier.price) || tier.price < 0) {
        throw new ConvexError("Price must be a non-negative integer (centavos)");
      }
      if (!Number.isInteger(tier.quantity) || tier.quantity < 1) {
        throw new ConvexError("Quantity must be a positive integer");
      }
    }

    // Delete all existing tiers for this event (replace-all pattern)
    const existingTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const tier of existingTiers) {
      await ctx.db.delete(tier._id);
    }

    // Insert new tiers
    const now = Date.now();
    for (const tier of args.tiers) {
      await ctx.db.insert("ticketTiers", {
        eventId: args.eventId,
        name: tier.name.trim(),
        price: tier.price,
        quantity: tier.quantity,
        soldCount: 0,
        description: tier.description,
        sortOrder: tier.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }

    return args.eventId;
  },
});

export const getPublicTiersByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const publicStatuses = ["published", "on_sale", "sold_out"];
    const event = await ctx.db.get(args.eventId);
    if (!event || !publicStatuses.includes(event.status)) return [];
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const getPriceRangeByEventIds = query({
  args: { eventIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const entries = await Promise.all(
      args.eventIds.map(async (eventId) => {
        const tiers = await ctx.db
          .query("ticketTiers")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_event_id", (q) => q.eq("eventId", eventId as any))
          .collect();
        if (tiers.length === 0) return null;
        const prices = tiers.map((t) => t.price);
        return {
          eventId,
          range: { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) },
        };
      })
    );
    const result: Record<string, { minPrice: number; maxPrice: number }> = {};
    for (const entry of entries) {
      if (entry) result[entry.eventId] = entry.range;
    }
    return result;
  },
});

export const getTiersByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Verify event exists and user has access
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }
    if (event.creatorId !== user._id && user.activeRole !== "admin") {
      throw new ConvexError("You do not have access to this event");
    }

    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});
