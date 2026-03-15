import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";

// Keep in sync with MAX_VENUE_PHOTOS in src/lib/utils/constants.ts
// (Convex backend cannot import from src/)
const MAX_VENUE_PHOTOS = 8;

// ---------------------------------------------------------------------------
// Upload URL
// ---------------------------------------------------------------------------

export const generateVenuePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    return await ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const createVenue = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    capacity: v.number(),
    description: v.optional(v.string()),
    amenities: v.array(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new ConvexError("Venue name must be between 1 and 100 characters");
    }
    const location = args.location.trim();
    if (!location || location.length > 200) {
      throw new ConvexError("Location must be between 1 and 200 characters");
    }
    if (!Number.isInteger(args.capacity) || args.capacity < 1 || args.capacity > 100000) {
      throw new ConvexError("Capacity must be a positive integer up to 100,000");
    }
    if (args.description && args.description.length > 2000) {
      throw new ConvexError("Description must be 2000 characters or less");
    }
    if (args.amenities.length > 20) {
      throw new ConvexError("Maximum 20 amenities per venue");
    }
    if (args.photoStorageIds.length > MAX_VENUE_PHOTOS) {
      throw new ConvexError(`Maximum ${MAX_VENUE_PHOTOS} photos per venue`);
    }

    const now = Date.now();
    return await ctx.db.insert("venues", {
      managerId: user._id,
      name,
      location,
      capacity: args.capacity,
      description: args.description,
      amenities: args.amenities,
      photoStorageIds: args.photoStorageIds,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateVenue = mutation({
  args: {
    venueId: v.id("venues"),
    name: v.string(),
    location: v.string(),
    capacity: v.number(),
    description: v.optional(v.string()),
    amenities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");

    const name = args.name.trim();
    if (!name || name.length > 100) {
      throw new ConvexError("Venue name must be between 1 and 100 characters");
    }
    const location = args.location.trim();
    if (!location || location.length > 200) {
      throw new ConvexError("Location must be between 1 and 200 characters");
    }
    if (!Number.isInteger(args.capacity) || args.capacity < 1 || args.capacity > 100000) {
      throw new ConvexError("Capacity must be a positive integer up to 100,000");
    }
    if (args.description && args.description.length > 2000) {
      throw new ConvexError("Description must be 2000 characters or less");
    }
    if (args.amenities.length > 20) {
      throw new ConvexError("Maximum 20 amenities per venue");
    }

    await ctx.db.patch(args.venueId, {
      name,
      location,
      capacity: args.capacity,
      description: args.description,
      amenities: args.amenities,
      updatedAt: Date.now(),
    });
  },
});

export const addVenuePhoto = mutation({
  args: {
    venueId: v.id("venues"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");
    if (venue.photoStorageIds.length >= MAX_VENUE_PHOTOS) {
      throw new ConvexError(`Maximum ${MAX_VENUE_PHOTOS} photos per venue`);
    }

    await ctx.db.patch(args.venueId, {
      photoStorageIds: [...venue.photoStorageIds, args.storageId],
      updatedAt: Date.now(),
    });
  },
});

export const removeVenuePhoto = mutation({
  args: {
    venueId: v.id("venues"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");
    // Security: verify the storageId actually belongs to this venue before deleting from storage
    if (!venue.photoStorageIds.includes(args.storageId)) {
      throw new ConvexError("Photo not found in this venue");
    }

    await ctx.db.patch(args.venueId, {
      photoStorageIds: venue.photoStorageIds.filter((id) => id !== args.storageId),
      updatedAt: Date.now(),
    });

    await ctx.storage.delete(args.storageId);
  },
});

// Deletes a storage object uploaded during create-mode that was never attached
// to a venue (e.g. user removed a pending photo or abandoned the create form).
export const deleteVenuePhotoUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    await ctx.storage.delete(args.storageId);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getVenuesByManager = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const venues = await ctx.db
      .query("venues")
      .withIndex("by_manager_id", (q) => q.eq("managerId", user._id))
      .collect();

    venues.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      venues.map(async (venue) => {
        const photoUrls = (
          await Promise.all(venue.photoStorageIds.map((id) => ctx.storage.getUrl(id)))
        ).filter((url): url is string => url !== null);
        return { ...venue, photoUrls };
      })
    );
  },
});

// ---------------------------------------------------------------------------
// Public Queries (no auth required)
// ---------------------------------------------------------------------------

export const listPublicVenues = query({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").collect();
    return Promise.all(
      venues.map(async (venue) => {
        const firstPhotoUrl =
          venue.photoStorageIds.length > 0
            ? await ctx.storage.getUrl(venue.photoStorageIds[0])
            : null;
        return {
          _id: venue._id,
          name: venue.name,
          location: venue.location,
          capacity: venue.capacity,
          amenities: venue.amenities,
          description: venue.description,
          firstPhotoUrl,
        };
      })
    );
  },
});

export const getPublicVenueById = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) return null;

    const photoUrls = (
      await Promise.all(
        venue.photoStorageIds.map((id) => ctx.storage.getUrl(id))
      )
    ).filter((url): url is string => url !== null);

    // Upcoming published events at this venue
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_venue_id", (q) =>
        q.eq("venueId", args.venueId as string)
      )
      .collect();
    const now = Date.now();
    const upcomingEvents = allEvents
      .filter((e) => e.status === "published" && e.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 10);

    // Public availability
    const availability = await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId))
      .collect();

    return {
      _id: venue._id,
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity,
      amenities: venue.amenities,
      description: venue.description,
      photoUrls,
      upcomingEvents,
      availability,
    };
  },
});

export const getEventsByVenue = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");

    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id)
      throw new ConvexError("You do not own this venue");

    const events = await ctx.db
      .query("events")
      .withIndex("by_venue_id", (q) =>
        q.eq("venueId", args.venueId as string)
      )
      .collect();

    return Promise.all(
      events.map(async (event) => {
        const creator = await ctx.db.get(event.creatorId);
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
        return {
          _id: event._id,
          title: event.title,
          date: event.date,
          time: event.time,
          status: event.status,
          totalSold,
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "",
        };
      })
    );
  },
});

export const getVenueById = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const venue = await ctx.db.get(args.venueId);
    if (!venue || venue.managerId !== user._id) return null;

    const photoUrls = (
      await Promise.all(venue.photoStorageIds.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);

    return { ...venue, photoUrls };
  },
});
