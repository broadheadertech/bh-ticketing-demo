import { query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];

export const getEventAnalytics = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only view analytics for your own events");
    }

    // Tiers
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const tierBreakdown = tiers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        name: t.name,
        price: t.price,
        quantity: t.quantity,
        soldCount: t.soldCount,
        remaining: t.quantity - t.soldCount,
        revenue: t.price * t.soldCount,
      }));

    const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
    const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);
    const totalRevenue = tiers.reduce((sum, t) => sum + t.price * t.soldCount, 0);

    // Tickets for timeline and attendance
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Unique buyers
    const uniqueBuyers = new Set(tickets.map((t) => t.buyerEmail)).size;

    // Average ticket price
    const avgTicketPrice = totalSold > 0 ? Math.round(totalRevenue / totalSold) : 0;

    // Sales timeline (group by day)
    const salesByDay = new Map<string, number>();
    for (const ticket of tickets) {
      const day = new Date(ticket.createdAt).toISOString().split("T")[0];
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + 1);
    }
    const salesTimeline = [...salesByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Attendance (scan stats)
    const scannedCount = tickets.filter((t) => t.scannedAt !== undefined).length;
    const scanRate = totalSold > 0 ? Math.round((scannedCount / totalSold) * 100) : 0;

    // Scan timeline (group by hour)
    const scansByHour = new Map<string, number>();
    for (const ticket of tickets) {
      if (ticket.scannedAt) {
        const hour = new Date(ticket.scannedAt).toISOString().slice(0, 13) + ":00";
        scansByHour.set(hour, (scansByHour.get(hour) ?? 0) + 1);
      }
    }
    const scanTimeline = [...scansByHour.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));

    return {
      event: {
        title: event.title,
        date: event.date,
        status: event.status,
      },
      metrics: {
        totalRevenue,
        totalSold,
        totalCapacity,
        avgTicketPrice,
        uniqueBuyers,
        scanRate,
        scannedCount,
      },
      tierBreakdown,
      salesTimeline,
      scanTimeline,
    };
  },
});

export const getCreatorOverviewAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .collect();

    const allTiers = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        return { event, tiers };
      })
    );

    // Get aggregate reviews
    const allReviews = await Promise.all(
      events.map(async (event) => {
        const reviews = await ctx.db
          .query("reviews")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        return reviews;
      })
    );
    const flatReviews = allReviews.flat();
    const avgRating =
      flatReviews.length > 0
        ? Math.round(
            (flatReviews.reduce((s, r) => s + r.rating, 0) / flatReviews.length) * 10
          ) / 10
        : 0;

    const totalRevenue = allTiers.reduce(
      (sum, { tiers }) =>
        sum + tiers.reduce((s, t) => s + t.price * t.soldCount, 0),
      0
    );
    const totalTicketsSold = allTiers.reduce(
      (sum, { tiers }) => sum + tiers.reduce((s, t) => s + t.soldCount, 0),
      0
    );

    const eventBreakdown = allTiers
      .map(({ event, tiers }) => {
        const ticketsSold = tiers.reduce((s, t) => s + t.soldCount, 0);
        const revenue = tiers.reduce((s, t) => s + t.price * t.soldCount, 0);
        const eventReviews = allReviews
          .flat()
          .filter((r) => r.eventId === event._id);
        const rating =
          eventReviews.length > 0
            ? Math.round(
                (eventReviews.reduce((s, r) => s + r.rating, 0) /
                  eventReviews.length) *
                  10
              ) / 10
            : 0;
        return {
          eventId: event._id,
          title: event.title,
          date: event.date,
          status: event.status,
          ticketsSold,
          revenue,
          rating,
          reviewCount: eventReviews.length,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totals: {
        totalRevenue,
        totalTicketsSold,
        totalEvents: events.length,
        avgRating,
        totalReviews: flatReviews.length,
      },
      eventBreakdown,
    };
  },
});
