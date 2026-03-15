import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Upserts or deletes a venue availability entry for a single date.
 * "available" status (the default) = delete any existing record.
 * "tentative" | "booked" = upsert a record.
 */
export const setVenueAvailability = mutation({
  args: {
    venueId: v.id("venues"),
    date: v.string(), // ISO "YYYY-MM-DD"
    status: v.string(), // "available" | "tentative" | "booked"
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    // Validate status
    const validStatuses = ["available", "tentative", "booked"];
    if (!validStatuses.includes(args.status)) {
      throw new ConvexError(`Invalid status: ${args.status}. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new ConvexError("Invalid date format. Expected YYYY-MM-DD");
    }

    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");

    const existing = await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_date", (q) =>
        q.eq("venueId", args.venueId).eq("date", args.date)
      )
      .unique();

    if (args.status === "available") {
      // "available" = no override record — delete if exists
      if (existing) await ctx.db.delete(existing._id);
      return;
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        notes: args.notes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("venueAvailability", {
        venueId: args.venueId,
        date: args.date,
        status: args.status,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all availability records for a venue (manager view).
 * Requires auth + venue ownership.
 */
export const getAvailabilityByVenue = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const venue = await ctx.db.get(args.venueId);
    if (!venue || venue.managerId !== user._id) return [];

    return await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId))
      .collect();
  },
});

/**
 * Returns all availability records for a venue (public view).
 * No auth required — for organizer discovery (Story 6.3).
 */
export const getPublicVenueAvailability = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId))
      .collect();
    return records.map((r) => ({
      date: r.date,
      status: r.status,
      notes: r.notes,
    }));
  },
});
