import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
const VALID_EVENT_TYPES = ["concert", "racing", "seminar", "class", "other"];

export const createEvent = mutation({
  args: {
    eventType: v.string(),
    title: v.string(),
    description: v.string(),
    date: v.number(),
    time: v.string(),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    artworkStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    // Validate eventType
    if (!VALID_EVENT_TYPES.includes(args.eventType)) {
      throw new ConvexError(
        `Invalid event type: ${args.eventType}. Must be one of: ${VALID_EVENT_TYPES.join(", ")}`
      );
    }

    // Validate title
    const title = args.title.trim();
    if (!title) {
      throw new ConvexError("Title is required");
    }
    if (title.length > 200) {
      throw new ConvexError("Title must be 200 characters or less");
    }

    // Validate description
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError("Description is required");
    }
    if (description.length > 5000) {
      throw new ConvexError("Description must be 5000 characters or less");
    }

    // Validate date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (args.date < today.getTime()) {
      throw new ConvexError("Date must be today or in the future");
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(args.time)) {
      throw new ConvexError("Time must be in HH:mm format");
    }

    // Resolve venue: if venueId provided, look up venue and use its name
    let resolvedVenueName = args.venueName;
    if (args.venueId) {
      const venue = await ctx.db.get(args.venueId as any);
      if (!venue) throw new ConvexError("Selected venue not found");
      resolvedVenueName = venue.name;
    }

    // Validate venueName if provided (free-text or resolved from venue)
    if (resolvedVenueName && resolvedVenueName.length > 200) {
      throw new ConvexError("Venue name must be 200 characters or less");
    }

    const now = Date.now();

    return await ctx.db.insert("events", {
      creatorId: user._id,
      eventType: args.eventType,
      title,
      description,
      date: args.date,
      time: args.time,
      venueId: args.venueId,
      venueName: resolvedVenueName,
      artworkStorageId: args.artworkStorageId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEventArtwork = mutation({
  args: {
    eventId: v.id("events"),
    artworkStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new ConvexError("You do not own this event");
    }
    if (event.status !== "draft") {
      throw new ConvexError("Can only update artwork for draft events");
    }

    // Delete old artwork file if it exists
    if (event.artworkStorageId) {
      await ctx.storage.delete(event.artworkStorageId);
    }

    await ctx.db.patch(args.eventId, {
      artworkStorageId: args.artworkStorageId,
      updatedAt: Date.now(),
    });
  },
});

export const removeEventArtwork = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new ConvexError("You do not own this event");
    }
    if (event.status !== "draft") {
      throw new ConvexError("Can only update artwork for draft events");
    }

    if (event.artworkStorageId) {
      await ctx.storage.delete(event.artworkStorageId);
    }

    await ctx.db.patch(args.eventId, {
      artworkStorageId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const publishEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id)
      throw new ConvexError("You do not own this event");
    if (event.status !== "draft")
      throw new ConvexError("Only draft events can be published");

    // Require at least one ticket tier
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    if (tiers.length === 0)
      throw new ConvexError("Add at least one ticket tier before publishing");

    // Require Stripe for paid tiers
    const hasPaidTiers = tiers.some((t) => t.price > 0);
    if (hasPaidTiers && !user.stripeAccountId)
      throw new ConvexError(
        "Connect your Stripe account before publishing a paid event"
      );

    // Require future date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (event.date < now.getTime())
      throw new ConvexError("Cannot publish an event with a past date");

    await ctx.db.patch(args.eventId, {
      status: "published",
      updatedAt: Date.now(),
    });

    // Notify creator's followers about new event (async — doesn't block publish)
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "creator").eq("entityId", event.creatorId)
      )
      .collect();

    if (followers.length > 0) {
      const creator = await ctx.db.get(event.creatorId);
      const creatorName = creator?.name ?? "A creator";
      for (const follower of followers) {
        await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
          userId: follower.followerId,
          type: "new_event",
          title: `New event from ${creatorName}`,
          message: event.title,
          entityType: "event",
          entityId: args.eventId,
        });
      }
    }
  },
});

export const cancelEvent = mutation({
  args: {
    eventId: v.id("events"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id)
      throw new ConvexError("You do not own this event");
    if (event.status !== "published")
      throw new ConvexError("Only published events can be cancelled");

    await ctx.db.patch(args.eventId, {
      status: "cancelled",
      cancellationReason: args.reason,
      updatedAt: Date.now(),
    });

    // Notify ticket holders about cancellation (async — doesn't block cancel)
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const uniqueBuyerIds = [
      ...new Set(
        tickets
          .map((t) => t.buyerUserId)
          .filter((id): id is string => !!id)
      ),
    ].filter((id) => id !== (user._id as string)); // Exclude creator

    for (const buyerId of uniqueBuyerIds) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
        userId: buyerId as never,
        type: "event_cancelled",
        title: `${event.title} has been cancelled`,
        message: args.reason || "No reason provided",
        entityType: "event",
        entityId: args.eventId,
      });
    }
  },
});

export const deleteDraftEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id)
      throw new ConvexError("You do not own this event");
    if (event.status !== "draft")
      throw new ConvexError("Only draft events can be deleted");

    // Cascade delete: ticket tiers
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const tier of tiers) {
      await ctx.db.delete(tier._id);
    }

    // Delete artwork storage file if exists
    if (event.artworkStorageId) {
      await ctx.storage.delete(event.artworkStorageId);
    }

    // Delete the event record
    await ctx.db.delete(args.eventId);
  },
});

export const cloneEvent = mutation({
  args: { sourceEventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const source = await ctx.db.get(args.sourceEventId);
    if (!source) throw new ConvexError("Event not found");
    if (source.creatorId !== user._id) {
      throw new ConvexError("You can only clone your own events");
    }

    const now = Date.now();

    // Create cloned event — draft status, no artwork, date reset
    const newEventId = await ctx.db.insert("events", {
      creatorId: user._id,
      eventType: source.eventType,
      title: source.title.replace(/ \(Copy\)$/, "") + " (Copy)",
      description: source.description,
      date: 0,
      time: source.time,
      venueName: source.venueName,
      venueId: source.venueId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate ticket tiers with reset soldCount
    const sourceTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.sourceEventId))
      .collect();

    for (const tier of sourceTiers) {
      await ctx.db.insert("ticketTiers", {
        eventId: newEventId,
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description,
        sortOrder: tier.sortOrder,
        soldCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newEventId;
  },
});

export const getMyEventsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .collect();

    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);
        const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
        const artworkUrl = event.artworkStorageId
          ? await ctx.storage.getUrl(event.artworkStorageId)
          : null;
        return { ...event, artworkUrl, totalCapacity, totalSold };
      })
    );

    // Sort: upcoming first (ASC), then past events (DESC)
    const now = Date.now();
    eventsWithStats.sort((a, b) => {
      const aUpcoming = a.date >= now;
      const bUpcoming = b.date >= now;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      return aUpcoming ? a.date - b.date : b.date - a.date;
    });

    // Compute summary alongside events (avoids separate query)
    const summary = {
      totalEvents: eventsWithStats.length,
      upcomingEvents: eventsWithStats.filter(
        (e) => e.date >= now && e.status !== "cancelled"
      ).length,
      totalTicketsSold: eventsWithStats.reduce(
        (sum, e) => sum + e.totalSold, 0
      ),
    };

    return { events: eventsWithStats, summary };
  },
});


export const getEventSalesData = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && user.activeRole !== "admin")
      throw new ConvexError("You do not have access to this event");

    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const tierData = tiers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((tier) => ({
        ...tier,
        tierRevenue: tier.price * tier.soldCount,
        remaining: tier.quantity - tier.soldCount,
      }));

    const totalTicketsSold = tierData.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = tierData.reduce((sum, t) => sum + t.tierRevenue, 0);
    const totalCapacity = tierData.reduce((sum, t) => sum + t.quantity, 0);

    return {
      event: {
        title: event.title,
        status: event.status,
        date: event.date,
        eventType: event.eventType,
      },
      tiers: tierData,
      totals: {
        totalTicketsSold,
        totalRevenue,
        totalCapacity,
        totalRemaining: totalCapacity - totalTicketsSold,
      },
    };
  },
});

export const getMyEventsRevenue = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .collect();

    const eventsRevenue = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        const ticketsSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
        const revenue = tiers.reduce(
          (sum, t) => sum + t.price * t.soldCount,
          0
        );
        return {
          _id: event._id,
          title: event.title,
          status: event.status,
          date: event.date,
          eventType: event.eventType,
          ticketsSold,
          revenue,
        };
      })
    );

    // Sort by revenue descending
    eventsRevenue.sort((a, b) => b.revenue - a.revenue);

    const totals = {
      totalRevenue: eventsRevenue.reduce((sum, e) => sum + e.revenue, 0),
      totalTicketsSold: eventsRevenue.reduce(
        (sum, e) => sum + e.ticketsSold,
        0
      ),
      totalEvents: eventsRevenue.length,
      eventsWithSales: eventsRevenue.filter((e) => e.ticketsSold > 0).length,
    };

    return { events: eventsRevenue, totals };
  },
});

export const getPublicEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "published") {
      throw new ConvexError("Event not found");
    }
    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
      .unique();
    const creator = await ctx.db.get(event.creatorId);
    return {
      ...event,
      artworkUrl,
      creatorStripeAccountId: creator?.stripeAccountId ?? null,
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };
  },
});

export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("Event not found");
    }

    // Only creator or admin can view
    if (
      event.creatorId !== user._id &&
      user.activeRole !== "admin"
    ) {
      throw new ConvexError("You do not have access to this event");
    }

    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;

    // Look up creator profile to display org name and logo on event detail page
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
      .unique();

    return {
      ...event,
      artworkUrl,
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };
  },
});

export const searchPublicEvents = query({
  args: {
    query: v.string(),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim() || args.query.trim().length < 2) return [];

    const now = Date.now();
    const publicStatuses = ["published", "on_sale", "sold_out"];

    const results = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) => {
        const base = q.search("title", args.query);
        if (args.eventType && args.eventType !== "all") {
          return base.eq("eventType", args.eventType);
        }
        return base;
      })
      .collect();

    const filtered = results.filter(
      (e) => publicStatuses.includes(e.status) && e.date >= now
    );

    return await Promise.all(
      filtered.map(async (event) => ({
        ...event,
        artworkUrl: event.artworkStorageId
          ? await ctx.storage.getUrl(event.artworkStorageId)
          : null,
      }))
    );
  },
});

export const getPublicEventDetailPage = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const publicStatuses = ["published", "on_sale", "sold_out"];
    const event = await ctx.db.get(args.eventId);
    if (!event || !publicStatuses.includes(event.status)) return null;
    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;
    const [creatorProfile, creator] = await Promise.all([
      ctx.db
        .query("creatorProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
        .unique(),
      ctx.db.get(event.creatorId),
    ]);
    return {
      ...event,
      artworkUrl,
      creatorStripeAccountId: creator?.stripeAccountId ?? null,
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };
  },
});

export const listPublicEvents = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const [published, onSale, soldOut] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .collect(),
      ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "on_sale"))
        .collect(),
      ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", "sold_out"))
        .collect(),
    ]);
    const publicEvents = [...published, ...onSale, ...soldOut]
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date - b.date);
    return await Promise.all(
      publicEvents.map(async (event) => ({
        ...event,
        artworkUrl: event.artworkStorageId
          ? await ctx.storage.getUrl(event.artworkStorageId)
          : null,
      }))
    );
  },
});
