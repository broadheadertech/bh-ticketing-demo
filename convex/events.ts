import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError, type GenericId } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole, requireRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
const VALID_EVENT_TYPES = ["concert", "racing", "seminar", "class", "other"];
const VALID_THEMES = ["aurora", "grandprix", "cosmic", "tropical", "fiesta"];

export const createEvent = mutation({
  args: {
    eventType: v.string(),
    theme: v.optional(v.string()),
    lineupArtistIds: v.optional(v.array(v.id("users"))),
    participantIds: v.optional(v.array(v.id("participants"))),
    title: v.string(),
    tagline: v.optional(v.string()),
    description: v.string(),
    date: v.number(),
    time: v.string(),
    endTime: v.optional(v.string()),
    doorsTime: v.optional(v.string()),
    days: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          date: v.number(),
          startTime: v.optional(v.string()),
          endTime: v.optional(v.string()),
        })
      )
    ),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    city: v.optional(v.string()),
    locationType: v.optional(v.string()),
    onlineUrl: v.optional(v.string()),
    onSaleStart: v.optional(v.number()),
    onSaleEnd: v.optional(v.number()),
    maxPerOrder: v.optional(v.number()),
    visibility: v.optional(v.string()),
    refundPolicy: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    goodToKnow: v.optional(v.string()),
    registrationQuestions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          type: v.string(),
          options: v.optional(v.array(v.string())),
          required: v.boolean(),
        })
      )
    ),
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

    // Validate theme preset
    if (args.theme && !VALID_THEMES.includes(args.theme)) {
      throw new ConvexError(
        `Invalid theme: ${args.theme}. Must be one of: ${VALID_THEMES.join(", ")}`
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
      const venue = await ctx.db.get(args.venueId as GenericId<"venues">);
      if (!venue) throw new ConvexError("Selected venue not found");
      resolvedVenueName = venue.name;
    }

    // Validate venueName if provided (free-text or resolved from venue)
    if (resolvedVenueName && resolvedVenueName.length > 200) {
      throw new ConvexError("Venue name must be 200 characters or less");
    }

    const now = Date.now();

    if (args.lineupArtistIds && args.lineupArtistIds.length > 20) {
      throw new ConvexError("A lineup can have at most 20 artists");
    }

    return await ctx.db.insert("events", {
      creatorId: user._id,
      eventType: args.eventType,
      theme: args.theme,
      lineupArtistIds: args.lineupArtistIds,
      participantIds: args.participantIds,
      title,
      tagline: args.tagline?.trim() || undefined,
      description,
      date: args.date,
      time: args.time,
      endTime: args.endTime || undefined,
      doorsTime: args.doorsTime || undefined,
      days: args.days && args.days.length > 1 ? args.days : undefined,
      venueId: args.venueId,
      venueName: resolvedVenueName,
      city: args.city?.trim() || undefined,
      locationType: args.locationType || undefined,
      onlineUrl: args.onlineUrl?.trim() || undefined,
      onSaleStart: args.onSaleStart,
      onSaleEnd: args.onSaleEnd,
      maxPerOrder: args.maxPerOrder,
      visibility: args.visibility || undefined,
      refundPolicy: args.refundPolicy?.trim() || undefined,
      ageRestriction: args.ageRestriction?.trim() || undefined,
      goodToKnow: args.goodToKnow?.trim() || undefined,
      registrationQuestions:
        args.registrationQuestions && args.registrationQuestions.length > 0
          ? args.registrationQuestions
          : undefined,
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
      theme: source.theme,
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

// All events for the admin calendar (any status). Lean list for chips/list rows;
// per-event detail comes from getCalendarEventDetail. Admin only.
export const getEventsForAdminCalendar = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const [events, users] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("users").collect(),
    ]);
    const nameById = new Map(users.map((u) => [u._id as string, u.name]));

    return events.map((e) => ({
      _id: e._id,
      title: e.title,
      date: e.date,
      time: e.time,
      status: e.status,
      theme: e.theme ?? null,
      eventType: e.eventType,
      venueName: e.venueName ?? null,
      creatorName: nameById.get(e.creatorId as string) ?? "Organizer",
    }));
  },
});

// Scope-aware event detail for the calendar drawer (every role uses this).
// Owners and admins get "full" scope (attendee counts); everyone else "limited"
// (artists, venue map, and tickets-available only). Non-public events are hidden
// from non-owners/non-admins.
export const getCalendarEventDetail = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const isOwner = event.creatorId === user._id;
    const isAdmin = user.roles.includes("admin");
    const publicStatuses = ["published", "on_sale", "sold_out", "completed"];
    if (!isOwner && !isAdmin && !publicStatuses.includes(event.status)) return null;
    const full = isOwner || isAdmin;

    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
      .collect();
    const maxAttendees = tiers.reduce((s, t) => s + t.quantity, 0);
    const currentAttendees = tiers.reduce((s, t) => s + t.soldCount, 0);
    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;
    const [creator, profile] = await Promise.all([
      ctx.db.get(event.creatorId),
      ctx.db
        .query("creatorProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
        .unique(),
    ]);

    // Resolve combined lineup names (artist accounts + participant roster).
    const lineup = await resolveLineupNames(ctx, event);

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      theme: event.theme ?? null,
      eventType: event.eventType,
      status: event.status,
      date: event.date,
      time: event.time,
      venueName: event.venueName ?? null,
      artworkUrl,
      scope: full ? ("full" as const) : ("limited" as const),
      // Max capacity is visible to everyone; tickets sold is owner/admin only.
      maxAttendees,
      currentAttendees: full ? currentAttendees : null,
      tiers: tiers
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((t) => ({
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          available: Math.max(0, t.quantity - t.soldCount),
        })),
      creatorName: profile?.displayName ?? creator?.name ?? "Organizer",
      artistsInvolved: lineup.filter((n): n is string => !!n),
      // Gap (see BACKOFFICE-INTEGRATION.md): venue map link not modeled yet.
      hasVenueMap: false,
    };
  },
});

// Edit the extended detail fields on an event. Owner (or admin) only.
export const updateEventDetails = mutation({
  args: {
    eventId: v.id("events"),
    tagline: v.optional(v.string()),
    endTime: v.optional(v.string()),
    doorsTime: v.optional(v.string()),
    city: v.optional(v.string()),
    locationType: v.optional(v.string()),
    onlineUrl: v.optional(v.string()),
    maxPerOrder: v.optional(v.number()),
    visibility: v.optional(v.string()),
    refundPolicy: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    goodToKnow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("You can only edit your own event");
    }
    const { eventId, ...rest } = args;
    await ctx.db.patch(eventId, { ...rest, updatedAt: Date.now() });
  },
});

// Resolve an event's combined lineup display names (legacy artist accounts +
// generic participant roster).
async function resolveLineupNames(
  ctx: QueryCtx,
  event: { lineupArtistIds?: GenericId<"users">[]; participantIds?: GenericId<"participants">[] }
): Promise<string[]> {
  const artistNames = await Promise.all(
    (event.lineupArtistIds ?? []).map(async (id) => {
      const a = await ctx.db.get(id);
      const p = await ctx.db
        .query("creatorProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", id))
        .unique();
      return p?.displayName ?? a?.name ?? null;
    })
  );
  const participantNames = await Promise.all(
    (event.participantIds ?? []).map(async (id) => {
      const p = await ctx.db.get(id);
      return p?.name ?? null;
    })
  );
  return [...artistNames, ...participantNames].filter((n): n is string => !!n);
}

// Update an event's generic participant lineup. Owner (or admin) only.
export const updateEventParticipants = mutation({
  args: { eventId: v.id("events"), participantIds: v.array(v.id("participants")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("You can only edit your own event's lineup");
    }
    if (args.participantIds.length > 50) {
      throw new ConvexError("A lineup can have at most 50 entries");
    }
    await ctx.db.patch(args.eventId, {
      participantIds: args.participantIds,
      updatedAt: Date.now(),
    });
  },
});

// Update an event's artist lineup. Owner (or admin) only.
export const updateEventLineup = mutation({
  args: { eventId: v.id("events"), lineupArtistIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && !user.roles.includes("admin")) {
      throw new ConvexError("You can only edit your own event's lineup");
    }
    if (args.lineupArtistIds.length > 20) {
      throw new ConvexError("A lineup can have at most 20 artists");
    }
    await ctx.db.patch(args.eventId, {
      lineupArtistIds: args.lineupArtistIds,
      updatedAt: Date.now(),
    });
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
    // Public surface = published + on_sale + sold_out (matches listPublicEvents /
    // getPublicEventDetailPage). Previously this only allowed "published", so any
    // on_sale event — i.e. exactly the ones being bought — threw "Event not found"
    // in the mobile buy/checkout screens and in web Stripe checkout.
    const publicStatuses = ["published", "on_sale", "sold_out"];
    const event = await ctx.db.get(args.eventId);
    if (!event || !publicStatuses.includes(event.status)) {
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
      // Payments: organizer's default provider + fee, for checkout resolution.
      creatorPaymentProvider: creator?.paymentProvider ?? null,
      creatorFeePercent: creator?.feePercent ?? null,
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
    // Combined lineup names (artist accounts + participant roster).
    const lineup = await resolveLineupNames(ctx, event);
    return {
      ...event,
      artworkUrl,
      lineup,
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
