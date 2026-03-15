import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];

// ---------------------------------------------------------------------------
// Public mutations (attendee-facing)
// ---------------------------------------------------------------------------

export const joinWaitlist = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");

    // Check if event is actually sold out
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const allSoldOut = tiers.length > 0 && tiers.every((t) => t.soldCount >= t.quantity);
    if (!allSoldOut) {
      throw new ConvexError("Event is not sold out — tickets are still available");
    }

    const emailLower = args.email.trim().toLowerCase();

    // Check duplicate
    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_email", (q) =>
        q.eq("eventId", args.eventId).eq("email", emailLower)
      )
      .first();
    if (existing) {
      throw new ConvexError("You are already on the waitlist for this event");
    }

    // Get current user if authenticated
    let userId;
    try {
      const user = await getAuthenticatedUser(ctx);
      userId = user._id;
    } catch {
      // Not authenticated — that's fine for waitlist
    }

    // Calculate position
    const allEntries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const position = allEntries.length + 1;

    await ctx.db.insert("waitlistEntries", {
      eventId: args.eventId,
      email: emailLower,
      userId,
      position,
      status: "waiting",
      createdAt: Date.now(),
    });
  },
});

export const leaveWaitlist = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const emailLower = args.email.trim().toLowerCase();

    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_email", (q) =>
        q.eq("eventId", args.eventId).eq("email", emailLower)
      )
      .first();

    if (!entry) {
      throw new ConvexError("You are not on the waitlist for this event");
    }

    await ctx.db.delete(entry._id);
  },
});

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const getWaitlistCount = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return entries.filter((e) => e.status === "waiting").length;
  },
});

export const isOnWaitlist = query({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_email", (q) =>
        q.eq("eventId", args.eventId).eq("email", args.email.trim().toLowerCase())
      )
      .first();
    return !!entry;
  },
});

// ---------------------------------------------------------------------------
// Creator queries
// ---------------------------------------------------------------------------

export const getEventWaitlist = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only view the waitlist for your own events");
    }

    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return entries
      .sort((a, b) => a.position - b.position)
      .map((e) => ({
        email: e.email,
        position: e.position,
        status: e.status,
        createdAt: e.createdAt,
      }));
  },
});

export const notifyWaitlist = mutation({
  args: {
    eventId: v.id("events"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only notify waitlist for your own events");
    }

    if (args.count < 1) {
      throw new ConvexError("Must notify at least 1 person");
    }

    const entries = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const waiting = entries
      .filter((e) => e.status === "waiting")
      .sort((a, b) => a.position - b.position)
      .slice(0, args.count);

    const now = Date.now();
    for (const entry of waiting) {
      await ctx.db.patch(entry._id, {
        status: "notified",
        notifiedAt: now,
      });
    }

    return { notified: waiting.length };
  },
});
