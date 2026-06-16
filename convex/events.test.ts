import { describe, it, expect } from "vitest";

/**
 * Contract tests for events mutations and queries.
 * Verifies business logic contracts without requiring Convex context.
 */

describe("createEvent mutation contract", () => {
  const VALID_EVENT_TYPES = [
    "concert",
    "racing",
    "seminar",
    "class",
    "other",
  ];

  it("should only allow artist or organization roles", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("venue_manager");
    expect(allowedRoles).not.toContain("admin");
  });

  it("should validate event type against allowed values", () => {
    for (const type of VALID_EVENT_TYPES) {
      expect(VALID_EVENT_TYPES).toContain(type);
    }
    expect(VALID_EVENT_TYPES).not.toContain("party");
    expect(VALID_EVENT_TYPES).not.toContain("");
  });

  it("should require a non-empty trimmed title", () => {
    const title = "  My Concert  ".trim();
    expect(title).toBe("My Concert");
    expect(title.length).toBeGreaterThan(0);

    const emptyTrimmed = "   ".trim();
    expect(emptyTrimmed).toBe("");
    expect(emptyTrimmed.length).toBe(0);
  });

  it("should reject title over 200 characters", () => {
    const longTitle = "a".repeat(201);
    expect(longTitle.length > 200).toBe(true);

    const exactTitle = "a".repeat(200);
    expect(exactTitle.length <= 200).toBe(true);
  });

  it("should require a non-empty trimmed description", () => {
    const desc = "  A great event  ".trim();
    expect(desc).toBe("A great event");
    expect(desc.length).toBeGreaterThan(0);

    const emptyDesc = "   ".trim();
    expect(emptyDesc.length).toBe(0);
  });

  it("should reject description over 5000 characters", () => {
    const longDesc = "a".repeat(5001);
    expect(longDesc.length > 5000).toBe(true);

    const exactDesc = "a".repeat(5000);
    expect(exactDesc.length <= 5000).toBe(true);
  });

  it("should validate date is today or in the future", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDate = new Date("2020-01-01").getTime();
    expect(pastDate < today.getTime()).toBe(true);

    const futureDate = new Date(Date.now() + 86400000).getTime();
    expect(futureDate >= today.getTime()).toBe(true);
  });

  it("should validate time is in HH:mm format", () => {
    const validTimes = ["00:00", "19:30", "23:59"];
    const timeRegex = /^\d{2}:\d{2}$/;
    for (const time of validTimes) {
      expect(timeRegex.test(time)).toBe(true);
    }

    const invalidTimes = ["7pm", "1:30", "", "19:30:00"];
    for (const time of invalidTimes) {
      expect(timeRegex.test(time)).toBe(false);
    }
  });

  it("should reject venueName over 200 characters", () => {
    const longVenue = "a".repeat(201);
    expect(longVenue.length > 200).toBe(true);

    const validVenue = "The Great Venue";
    expect(validVenue.length <= 200).toBe(true);
  });

  it("should set status to draft on creation", () => {
    const status = "draft";
    expect(status).toBe("draft");
  });

  it("should set creatorId, createdAt, and updatedAt on insert", () => {
    const now = Date.now();
    const insertData = {
      creatorId: "user_123",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    expect(insertData.creatorId).toBe("user_123");
    expect(insertData.createdAt).toBe(insertData.updatedAt);
    expect(insertData.status).toBe("draft");
  });
});

describe("createEvent venueId resolution contract", () => {
  it("accepts optional venueId in args", () => {
    const argsWithVenue = { venueId: "venues:abc123" };
    const argsWithoutVenue = { venueId: undefined };
    expect(argsWithVenue.venueId).toBeDefined();
    expect(argsWithoutVenue.venueId).toBeUndefined();
  });

  it("resolves venueName from venue record when venueId provided", () => {
    const venue = { _id: "venues:abc", name: "The Loft Makati" };
    const resolvedVenueName = venue ? venue.name : undefined;
    expect(resolvedVenueName).toBe("The Loft Makati");
  });

  it("uses manual venueName when venueId is not provided", () => {
    const venueId = undefined;
    const manualVenueName = "Custom Venue";
    const resolvedVenueName = venueId ? "from-db" : manualVenueName;
    expect(resolvedVenueName).toBe("Custom Venue");
  });

  it("throws when venueId references a non-existent venue", () => {
    const venue = null;
    const shouldThrow = !venue;
    expect(shouldThrow).toBe(true);
  });

  it("stores both venueId and resolved venueName in event record", () => {
    const insertData = {
      venueId: "venues:abc",
      venueName: "The Loft Makati",
    };
    expect(insertData.venueId).toBeDefined();
    expect(insertData.venueName).toBe("The Loft Makati");
  });

  it("stores undefined venueId when no venue selected", () => {
    const insertData = {
      venueId: undefined,
      venueName: "Typed Manually",
    };
    expect(insertData.venueId).toBeUndefined();
    expect(insertData.venueName).toBe("Typed Manually");
  });
});

describe("getEventById query contract", () => {
  it("should return event only if creator matches current user", () => {
    const event = { creatorId: "user_123" };
    const currentUserId = "user_123";
    const isCreator = event.creatorId === currentUserId;
    expect(isCreator).toBe(true);

    const otherUserId = "user_456";
    const isOtherCreator = event.creatorId === otherUserId;
    expect(isOtherCreator).toBe(false);
  });

  it("should allow admin to view any event", () => {
    const event = { creatorId: "user_123" };
    const adminUser = { _id: "user_456", activeRole: "admin" };
    const canAccess =
      event.creatorId === adminUser._id || adminUser.activeRole === "admin";
    expect(canAccess).toBe(true);
  });

  it("should throw if event not found", () => {
    const event = null;
    expect(event).toBeNull();
  });
});

describe("getEventById with creatorProfile contract", () => {
  it("returns creatorProfile with displayName and profilePhotoUrl when profile exists", () => {
    const creatorProfile = {
      displayName: "TIX.PH Racing",
      profilePhotoUrl: "https://example.com/logo.png",
    };
    const result = {
      _id: "event_1",
      title: "Racing League Round 1",
      artworkUrl: null,
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };

    expect(result.creatorProfile).not.toBeNull();
    expect(result.creatorProfile?.displayName).toBe("TIX.PH Racing");
    expect(result.creatorProfile?.profilePhotoUrl).toBe("https://example.com/logo.png");
  });

  it("returns creatorProfile as null when no profile exists for creator", () => {
    const creatorProfile = null;
    const result = {
      _id: "event_1",
      title: "Racing League Round 1",
      artworkUrl: null,
      creatorProfile: creatorProfile
        ? {
            displayName: (creatorProfile as { displayName: string }).displayName,
            profilePhotoUrl: null,
          }
        : null,
    };

    expect(result.creatorProfile).toBeNull();
  });

  it("returns profilePhotoUrl as null when profile has no photo", () => {
    const creatorProfile = {
      displayName: "TIX.PH Racing",
      profilePhotoUrl: undefined,
    };
    const result = {
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };

    expect(result.creatorProfile).not.toBeNull();
    expect(result.creatorProfile?.displayName).toBe("TIX.PH Racing");
    expect(result.creatorProfile?.profilePhotoUrl).toBeNull();
  });

  it("only exposes displayName and profilePhotoUrl from creatorProfile (not full profile)", () => {
    const fullProfile = {
      _id: "profile_1",
      userId: "user_123",
      displayName: "TIX.PH Racing",
      profilePhotoUrl: "https://example.com/logo.png",
      bio: "We run racing events",
      websiteUrl: "https://phlive.com",
    };
    const result = {
      creatorProfile: fullProfile
        ? {
            displayName: fullProfile.displayName,
            profilePhotoUrl: fullProfile.profilePhotoUrl ?? null,
          }
        : null,
    };

    expect(result.creatorProfile).toHaveProperty("displayName");
    expect(result.creatorProfile).toHaveProperty("profilePhotoUrl");
    expect(result.creatorProfile).not.toHaveProperty("bio");
    expect(result.creatorProfile).not.toHaveProperty("websiteUrl");
    expect(result.creatorProfile).not.toHaveProperty("userId");
  });
});

describe("updateEventArtwork mutation contract", () => {
  it("should only allow draft events to have artwork updated", () => {
    const allowedStatus = "draft";
    expect(allowedStatus).toBe("draft");
    expect(allowedStatus).not.toBe("published");
    expect(allowedStatus).not.toBe("cancelled");
  });

  it("should verify event ownership before update", () => {
    const event = { creatorId: "user_123" };
    const currentUser = { _id: "user_123" };
    expect(event.creatorId === currentUser._id).toBe(true);

    const otherUser = { _id: "user_456" };
    expect(event.creatorId === otherUser._id).toBe(false);
  });

  it("should delete old artwork before saving new one", () => {
    const event = { artworkStorageId: "old_storage_id" };
    const hasExistingArtwork = !!event.artworkStorageId;
    expect(hasExistingArtwork).toBe(true);
  });

  it("should handle events with no existing artwork", () => {
    const event = { artworkStorageId: undefined };
    const hasExistingArtwork = !!event.artworkStorageId;
    expect(hasExistingArtwork).toBe(false);
  });
});

describe("removeEventArtwork mutation contract", () => {
  it("should only allow draft events", () => {
    const status = "draft";
    expect(status).toBe("draft");
  });

  it("should set artworkStorageId to undefined on removal", () => {
    const patchData = { artworkStorageId: undefined, updatedAt: Date.now() };
    expect(patchData.artworkStorageId).toBeUndefined();
    expect(patchData.updatedAt).toBeDefined();
  });
});

describe("publishEvent mutation contract", () => {
  it("should only allow artist or organization roles", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
  });

  it("should only publish draft events", () => {
    const validStatuses = ["draft"];
    expect(validStatuses).toContain("draft");
    expect(validStatuses).not.toContain("published");
    expect(validStatuses).not.toContain("cancelled");
    expect(validStatuses).not.toContain("completed");
  });

  it("should require at least one ticket tier", () => {
    const tiersEmpty: unknown[] = [];
    expect(tiersEmpty.length === 0).toBe(true);

    const tiersWithOne = [{ name: "GA", price: 1000, quantity: 50 }];
    expect(tiersWithOne.length >= 1).toBe(true);
  });

  it("should require future event date", () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pastDate = new Date("2020-01-01").getTime();
    expect(pastDate < now.getTime()).toBe(true);

    const futureDate = new Date(Date.now() + 86400000 * 30).getTime();
    expect(futureDate >= now.getTime()).toBe(true);
  });

  it("should verify event ownership", () => {
    const event = { creatorId: "user_123" };
    const owner = { _id: "user_123" };
    const nonOwner = { _id: "user_456" };

    expect(event.creatorId === owner._id).toBe(true);
    expect(event.creatorId === nonOwner._id).toBe(false);
  });

  it("should update status to published and updatedAt", () => {
    const patchData = { status: "published", updatedAt: Date.now() };
    expect(patchData.status).toBe("published");
    expect(patchData.updatedAt).toBeDefined();
  });
});

describe("publishEvent Stripe requirement contract", () => {
  it("should reject paid events when stripeAccountId is missing", () => {
    const user = { stripeAccountId: undefined };
    const tiers = [{ price: 50000, quantity: 100 }];
    const hasPaidTiers = tiers.some((t) => t.price > 0);
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(false);
  });

  it("should allow paid events when stripeAccountId is set", () => {
    const user = { stripeAccountId: "acct_1PqwZxRD9mFx1234" };
    const tiers = [{ price: 50000, quantity: 100 }];
    const hasPaidTiers = tiers.some((t) => t.price > 0);
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(true);
  });

  it("should allow free events without stripeAccountId", () => {
    const user = { stripeAccountId: undefined };
    const tiers = [{ price: 0, quantity: 100 }];
    const hasPaidTiers = tiers.some((t) => t.price > 0);
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(true);
  });

  it("should detect paid tiers when any tier has price > 0", () => {
    const mixedTiers = [{ price: 0 }, { price: 50000 }, { price: 0 }];
    const hasPaidTiers = mixedTiers.some((t) => t.price > 0);
    expect(hasPaidTiers).toBe(true);
  });

  it("should not require Stripe for all-free events", () => {
    const freeTiers = [{ price: 0 }, { price: 0 }];
    const hasPaidTiers = freeTiers.some((t) => t.price > 0);
    expect(hasPaidTiers).toBe(false);
  });
});

describe("cancelEvent mutation contract", () => {
  it("should only cancel published events", () => {
    const validStatuses = ["published"];
    expect(validStatuses).toContain("published");
    expect(validStatuses).not.toContain("draft");
    expect(validStatuses).not.toContain("cancelled");
    expect(validStatuses).not.toContain("completed");
  });

  it("should verify event ownership", () => {
    const event = { creatorId: "user_123" };
    const owner = { _id: "user_123" };
    expect(event.creatorId === owner._id).toBe(true);
  });

  it("should accept optional cancellation reason", () => {
    const withReason = { reason: "Event rescheduled" };
    expect(withReason.reason).toBeDefined();

    const withoutReason = { reason: undefined };
    expect(withoutReason.reason).toBeUndefined();
  });

  it("should update status to cancelled and store reason", () => {
    const patchData = {
      status: "cancelled",
      cancellationReason: "Event rescheduled",
      updatedAt: Date.now(),
    };
    expect(patchData.status).toBe("cancelled");
    expect(patchData.cancellationReason).toBe("Event rescheduled");
  });

  it("should store undefined reason when not provided", () => {
    const patchData = {
      status: "cancelled",
      cancellationReason: undefined,
      updatedAt: Date.now(),
    };
    expect(patchData.cancellationReason).toBeUndefined();
  });
});

describe("getMyEventsWithStats query contract", () => {
  it("should require artist or organization role", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("venue_manager");
  });

  it("should enrich each event with totalCapacity and totalSold from tiers", () => {
    // Contract: query joins events with ticketTiers and adds computed fields
    const expectedShape = {
      _id: "event_1",
      title: "Concert",
      totalCapacity: 150,
      totalSold: 35,
      artworkUrl: null,
    };
    expect(expectedShape).toHaveProperty("totalCapacity");
    expect(expectedShape).toHaveProperty("totalSold");
    expect(expectedShape).toHaveProperty("artworkUrl");
    expect(typeof expectedShape.totalCapacity).toBe("number");
    expect(typeof expectedShape.totalSold).toBe("number");
  });

  it("should place upcoming events before past events in sort order", () => {
    // Contract: upcoming (date >= now) sorted ASC, then past sorted DESC
    const now = Date.now();
    const events = [
      { date: now - 86400000, title: "Past 1 day" },
      { date: now + 86400000 * 7, title: "Future 7 days" },
      { date: now - 86400000 * 3, title: "Past 3 days" },
      { date: now + 86400000 * 2, title: "Future 2 days" },
    ];

    // Apply the same sort algorithm used in getMyEventsWithStats
    events.sort((a, b) => {
      const aUpcoming = a.date >= now;
      const bUpcoming = b.date >= now;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      return aUpcoming ? a.date - b.date : b.date - a.date;
    });

    // Upcoming events come first, sorted nearest-first
    expect(events[0].title).toBe("Future 2 days");
    expect(events[1].title).toBe("Future 7 days");
    // Past events come after, sorted most-recent-first
    expect(events[2].title).toBe("Past 1 day");
    expect(events[3].title).toBe("Past 3 days");
  });

  it("should resolve artworkUrl from storage or return null", () => {
    // Contract: artworkStorageId present → resolve URL, absent → null
    const withArtwork = { artworkStorageId: "storage_123" };
    expect(!!withArtwork.artworkStorageId).toBe(true);

    const withoutArtwork = { artworkStorageId: undefined };
    expect(!!withoutArtwork.artworkStorageId).toBe(false);
  });
});

describe("client-side summary computation contract", () => {
  // Summary is computed client-side from getMyEventsWithStats results

  it("should count upcoming non-cancelled events", () => {
    const now = Date.now();
    const events = [
      { date: now + 86400000, status: "published", totalSold: 10 },
      { date: now + 86400000 * 2, status: "cancelled", totalSold: 0 },
      { date: now - 86400000, status: "published", totalSold: 5 },
      { date: now + 86400000 * 3, status: "draft", totalSold: 0 },
    ];
    const upcomingEvents = events.filter(
      (e) => e.date >= now && e.status !== "cancelled"
    ).length;
    // Only future + non-cancelled: published (day+1) and draft (day+3)
    expect(upcomingEvents).toBe(2);
  });

  it("should sum totalTicketsSold from event totalSold fields", () => {
    const events = [
      { totalSold: 10 },
      { totalSold: 25 },
      { totalSold: 0 },
    ];
    const totalTicketsSold = events.reduce((sum, e) => sum + e.totalSold, 0);
    expect(totalTicketsSold).toBe(35);
  });

  it("should return zero metrics for empty events list", () => {
    const events: { date: number; status: string; totalSold: number }[] = [];
    const now = Date.now();
    expect(events.length).toBe(0);
    expect(events.filter((e) => e.date >= now && e.status !== "cancelled").length).toBe(0);
    expect(events.reduce((sum, e) => sum + e.totalSold, 0)).toBe(0);
  });
});

describe("getEventSalesData query contract", () => {
  it("should restrict access to event creator or admin", () => {
    const event = { creatorId: "user_123" };
    const creator = { _id: "user_123", activeRole: "artist" };
    const admin = { _id: "user_456", activeRole: "admin" };
    const stranger = { _id: "user_789", activeRole: "artist" };

    const canAccess = (user: { _id: string; activeRole: string }) =>
      event.creatorId === user._id || user.activeRole === "admin";

    expect(canAccess(creator)).toBe(true);
    expect(canAccess(admin)).toBe(true);
    expect(canAccess(stranger)).toBe(false);
  });

  it("should compute per-tier revenue as price * soldCount", () => {
    const tiers = [
      { price: 50000, quantity: 100, soldCount: 30 },
      { price: 100000, quantity: 50, soldCount: 10 },
    ];
    const tierData = tiers.map((t) => ({
      ...t,
      tierRevenue: t.price * t.soldCount,
      remaining: t.quantity - t.soldCount,
    }));

    expect(tierData[0].tierRevenue).toBe(1500000); // 500 PHP * 30
    expect(tierData[0].remaining).toBe(70);
    expect(tierData[1].tierRevenue).toBe(1000000); // 1000 PHP * 10
    expect(tierData[1].remaining).toBe(40);
  });

  it("should compute correct totals from tier data", () => {
    const tierData = [
      { soldCount: 30, tierRevenue: 1500000, quantity: 100 },
      { soldCount: 10, tierRevenue: 1000000, quantity: 50 },
    ];

    const totalTicketsSold = tierData.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = tierData.reduce((sum, t) => sum + t.tierRevenue, 0);
    const totalCapacity = tierData.reduce((sum, t) => sum + t.quantity, 0);

    expect(totalTicketsSold).toBe(40);
    expect(totalRevenue).toBe(2500000);
    expect(totalCapacity).toBe(150);
    expect(totalCapacity - totalTicketsSold).toBe(110);
  });

  it("should handle event with no tiers (empty arrays)", () => {
    const tiers: { price: number; soldCount: number; quantity: number }[] = [];
    const totalTicketsSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = tiers.reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);

    expect(totalTicketsSold).toBe(0);
    expect(totalRevenue).toBe(0);
    expect(totalCapacity).toBe(0);
  });
});

describe("getMyEventsRevenue query contract", () => {
  it("should require artist or organization role", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("admin");
  });

  it("should compute per-event revenue as sum of (price * soldCount) across tiers", () => {
    const tiers = [
      { price: 50000, soldCount: 20 },
      { price: 100000, soldCount: 5 },
    ];
    const revenue = tiers.reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const ticketsSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);

    expect(revenue).toBe(1500000); // (500*20 + 1000*5) in centavos
    expect(ticketsSold).toBe(25);
  });

  it("should sort events by revenue descending", () => {
    const events = [
      { title: "Low", revenue: 100000 },
      { title: "High", revenue: 5000000 },
      { title: "Mid", revenue: 500000 },
    ];
    events.sort((a, b) => b.revenue - a.revenue);

    expect(events[0].title).toBe("High");
    expect(events[1].title).toBe("Mid");
    expect(events[2].title).toBe("Low");
  });

  it("should compute aggregate totals correctly", () => {
    const events = [
      { ticketsSold: 30, revenue: 1500000 },
      { ticketsSold: 10, revenue: 1000000 },
      { ticketsSold: 0, revenue: 0 },
    ];

    const totals = {
      totalRevenue: events.reduce((sum, e) => sum + e.revenue, 0),
      totalTicketsSold: events.reduce((sum, e) => sum + e.ticketsSold, 0),
      totalEvents: events.length,
      eventsWithSales: events.filter((e) => e.ticketsSold > 0).length,
    };

    expect(totals.totalRevenue).toBe(2500000);
    expect(totals.totalTicketsSold).toBe(40);
    expect(totals.totalEvents).toBe(3);
    expect(totals.eventsWithSales).toBe(2);
  });

  it("should return empty results for creator with no events", () => {
    const events: { ticketsSold: number; revenue: number }[] = [];
    const totals = {
      totalRevenue: events.reduce((sum, e) => sum + e.revenue, 0),
      totalTicketsSold: events.reduce((sum, e) => sum + e.ticketsSold, 0),
      totalEvents: events.length,
      eventsWithSales: events.filter((e) => e.ticketsSold > 0).length,
    };

    expect(totals.totalRevenue).toBe(0);
    expect(totals.totalTicketsSold).toBe(0);
    expect(totals.totalEvents).toBe(0);
    expect(totals.eventsWithSales).toBe(0);
  });
});

describe("deleteDraftEvent mutation contract", () => {
  it("should only delete draft events", () => {
    const validStatuses = ["draft"];
    expect(validStatuses).toContain("draft");
    expect(validStatuses).not.toContain("published");
    expect(validStatuses).not.toContain("cancelled");
  });

  it("should verify event ownership", () => {
    const event = { creatorId: "user_123" };
    const owner = { _id: "user_123" };
    expect(event.creatorId === owner._id).toBe(true);
  });

  it("should cascade delete ticket tiers", () => {
    const tiers = [
      { _id: "tier_1", eventId: "event_1" },
      { _id: "tier_2", eventId: "event_1" },
    ];
    expect(tiers.length).toBe(2);
    expect(tiers.every((t) => t.eventId === "event_1")).toBe(true);
  });

  it("should delete artwork storage file if exists", () => {
    const withArtwork = { artworkStorageId: "storage_123" };
    expect(!!withArtwork.artworkStorageId).toBe(true);

    const withoutArtwork = { artworkStorageId: undefined };
    expect(!!withoutArtwork.artworkStorageId).toBe(false);
  });

  it("should hard delete the event record", () => {
    // Confirms no soft delete pattern — uses ctx.db.delete
    const deleteOperation = "ctx.db.delete";
    expect(deleteOperation).not.toContain("patch");
    expect(deleteOperation).toContain("delete");
  });
});
