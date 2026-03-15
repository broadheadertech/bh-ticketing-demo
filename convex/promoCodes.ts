import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
const CODE_REGEX = /^[A-Z0-9]{4,20}$/;

export const createPromoCode = mutation({
  args: {
    eventId: v.id("events"),
    code: v.string(),
    discountType: v.string(),
    discountValue: v.number(),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only manage promo codes for your own events");
    }

    // Validate code format
    const upperCode = args.code.trim().toUpperCase();
    if (!CODE_REGEX.test(upperCode)) {
      throw new ConvexError(
        "Code must be 4-20 alphanumeric characters"
      );
    }

    // Validate discount type
    if (args.discountType !== "percentage" && args.discountType !== "fixed") {
      throw new ConvexError("Discount type must be 'percentage' or 'fixed'");
    }

    // Validate discount value
    if (args.discountValue <= 0) {
      throw new ConvexError("Discount value must be greater than 0");
    }
    if (args.discountType === "percentage" && args.discountValue > 100) {
      throw new ConvexError("Percentage discount cannot exceed 100");
    }

    // Validate max uses
    if (args.maxUses !== undefined && args.maxUses < 1) {
      throw new ConvexError("Max uses must be at least 1");
    }

    // Validate expiration
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) {
      throw new ConvexError("Expiration date must be in the future");
    }

    // Check uniqueness within event
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_event_code", (q) =>
        q.eq("eventId", args.eventId).eq("code", upperCode)
      )
      .first();
    if (existing) {
      throw new ConvexError("A promo code with this name already exists for this event");
    }

    await ctx.db.insert("promoCodes", {
      eventId: args.eventId,
      code: upperCode,
      discountType: args.discountType,
      discountValue: args.discountValue,
      maxUses: args.maxUses,
      usedCount: 0,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const togglePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const promo = await ctx.db.get(args.promoCodeId);
    if (!promo) throw new ConvexError("Promo code not found");

    const event = await ctx.db.get(promo.eventId);
    if (!event || event.creatorId !== user._id) {
      throw new ConvexError("You can only manage promo codes for your own events");
    }

    await ctx.db.patch(args.promoCodeId, {
      isActive: !promo.isActive,
    });
  },
});

// Public query — validates a promo code for checkout (no auth required)
export const validatePromoCode = query({
  args: {
    eventId: v.id("events"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const upperCode = args.code.trim().toUpperCase();

    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_event_code", (q) =>
        q.eq("eventId", args.eventId).eq("code", upperCode)
      )
      .first();

    if (!promo) {
      return { valid: false as const, error: "Invalid promo code" };
    }

    if (!promo.isActive) {
      return { valid: false as const, error: "This promo code is no longer active" };
    }

    if (promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) {
      return { valid: false as const, error: "This promo code has reached its usage limit" };
    }

    if (promo.expiresAt !== undefined && promo.expiresAt <= Date.now()) {
      return { valid: false as const, error: "This promo code has expired" };
    }

    return {
      valid: true as const,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      code: promo.code,
    };
  },
});

// Mutation to increment usedCount (called from webhook)
export const incrementPromoCodeUsage = mutation({
  args: {
    eventId: v.id("events"),
    code: v.string(),
    quantity: v.number(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }

    const promo = await ctx.db
      .query("promoCodes")
      .withIndex("by_event_code", (q) =>
        q.eq("eventId", args.eventId).eq("code", args.code)
      )
      .first();

    if (promo) {
      await ctx.db.patch(promo._id, {
        usedCount: promo.usedCount + args.quantity,
      });
    }
  },
});

export const getEventPromoCodes = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only view promo codes for your own events");
    }

    const codes = await ctx.db
      .query("promoCodes")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return codes.map((c) => ({
      _id: c._id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  },
});
