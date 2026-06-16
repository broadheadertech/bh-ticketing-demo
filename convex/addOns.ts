import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
const MAX_ADDONS = 12;

// Replace-all save of an event's purchasable add-ons (owner, draft only).
export const saveAddOns = mutation({
  args: {
    eventId: v.id("events"),
    addOns: v.array(
      v.object({
        name: v.string(),
        price: v.number(), // centavos
        description: v.optional(v.string()),
        quantity: v.optional(v.number()),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) throw new ConvexError("You do not own this event");
    if (args.addOns.length > MAX_ADDONS) throw new ConvexError(`Max ${MAX_ADDONS} add-ons`);

    const existing = await ctx.db
      .query("eventAddOns")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const a of existing) await ctx.db.delete(a._id);

    const now = Date.now();
    for (const a of args.addOns) {
      const name = a.name.trim();
      if (!name) continue;
      if (!Number.isInteger(a.price) || a.price < 0) {
        throw new ConvexError("Add-on price must be a non-negative integer (centavos)");
      }
      await ctx.db.insert("eventAddOns", {
        eventId: args.eventId,
        name,
        price: a.price,
        description: a.description?.trim() || undefined,
        quantity: a.quantity,
        soldCount: 0,
        sortOrder: a.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }
    return args.eventId;
  },
});

export const getPublicAddOnsByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const addOns = await ctx.db
      .query("eventAddOns")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return addOns
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((a) => ({
        _id: a._id,
        name: a.name,
        price: a.price,
        description: a.description ?? null,
        available: a.quantity != null ? Math.max(0, a.quantity - a.soldCount) : null,
      }));
  },
});
