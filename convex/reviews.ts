import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const submitReview = mutation({
  args: {
    eventId: v.id("events"),
    rating: v.number(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Validate rating: integer 1-5
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Rating must be an integer between 1 and 5");
    }

    // Validate text length
    if (args.text && args.text.length > 500) {
      throw new ConvexError("Review text must be 500 characters or fewer");
    }

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");

    // Check duplicate review
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_event_reviewer", (q) =>
        q.eq("eventId", args.eventId).eq("reviewerId", user._id)
      )
      .first();
    if (existing) {
      throw new ConvexError("You have already reviewed this event");
    }

    // Verify attendance: user must have a scanned ticket for this event
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email;
    if (!email) throw new ConvexError("No email in identity");

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const hasScannedTicket = tickets.some(
      (t) => t.buyerEmail === email && t.scannedAt !== undefined
    );

    if (!hasScannedTicket) {
      throw new ConvexError("Only verified attendees can leave reviews");
    }

    // Insert review
    await ctx.db.insert("reviews", {
      eventId: args.eventId,
      reviewerId: user._id,
      rating: args.rating,
      text: args.text?.trim() || undefined,
      isVerified: true,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Public queries (no auth required)
// ---------------------------------------------------------------------------

export const getEventReviews = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Sort by most recent first
    reviews.sort((a, b) => b.createdAt - a.createdAt);

    // Join with users for reviewer name — explicit fields only (AC3)
    const enriched = await Promise.all(
      reviews.map(async (r) => {
        const user = await ctx.db.get(r.reviewerId);
        return {
          reviewerName: user?.name ?? "Anonymous",
          rating: r.rating,
          text: r.text,
          createdAt: r.createdAt,
          isVerified: r.isVerified,
        };
      })
    );

    // Compute average
    const totalReviews = enriched.length;
    const averageRating =
      totalReviews > 0
        ? enriched.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return {
      reviews: enriched,
      averageRating: Math.round(averageRating * 10) / 10, // 1 decimal
      totalReviews,
    };
  },
});

export const getCreatorAggregateRating = query({
  args: { creatorId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events by creator
    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", args.creatorId))
      .collect();

    if (events.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    // Fetch all reviews for creator's events
    let allRatings: number[] = [];
    for (const event of events) {
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
        .collect();
      allRatings = allRatings.concat(reviews.map((r) => r.rating));
    }

    const totalReviews = allRatings.length;
    const averageRating =
      totalReviews > 0
        ? allRatings.reduce((sum, r) => sum + r, 0) / totalReviews
        : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    };
  },
});

// ---------------------------------------------------------------------------
// Authenticated queries
// ---------------------------------------------------------------------------

export const getMyReviewedEventIds = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewer_id", (q) => q.eq("reviewerId", user._id))
      .collect();

    return reviews.map((r) => r.eventId);
  },
});
