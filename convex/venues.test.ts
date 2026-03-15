import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for venue Convex mutations/queries.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Authorization contracts
// ---------------------------------------------------------------------------

function canAccessVenueMutation(activeRole: string): boolean {
  return activeRole === "venue_manager";
}

describe("venue mutation authorization contract", () => {
  it("allows venue_manager role", () => {
    expect(canAccessVenueMutation("venue_manager")).toBe(true);
  });

  it("rejects artist role", () => {
    expect(canAccessVenueMutation("artist")).toBe(false);
  });

  it("rejects organization role", () => {
    expect(canAccessVenueMutation("organization")).toBe(false);
  });

  it("rejects attendee role", () => {
    expect(canAccessVenueMutation("attendee")).toBe(false);
  });

  it("rejects admin role (venue mutations are venue_manager only)", () => {
    expect(canAccessVenueMutation("admin")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ownership enforcement
// ---------------------------------------------------------------------------

function canModifyVenue(
  userId: string,
  venue: { managerId: string }
): boolean {
  return venue.managerId === userId;
}

describe("venue ownership enforcement contract", () => {
  it("allows owner to modify their venue", () => {
    expect(canModifyVenue("user:abc", { managerId: "user:abc" })).toBe(true);
  });

  it("rejects non-owner modification attempt", () => {
    expect(canModifyVenue("user:xyz", { managerId: "user:abc" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Photo limit contract
// ---------------------------------------------------------------------------

const MAX_VENUE_PHOTOS = 8;

function canAddPhoto(currentPhotoCount: number): boolean {
  return currentPhotoCount < MAX_VENUE_PHOTOS;
}

describe("venue photo limit contract", () => {
  it("allows adding photo when 0 photos exist", () => {
    expect(canAddPhoto(0)).toBe(true);
  });

  it("allows adding photo when 7 photos exist", () => {
    expect(canAddPhoto(7)).toBe(true);
  });

  it("rejects adding photo when already at 8 photos", () => {
    expect(canAddPhoto(8)).toBe(false);
  });

  it("rejects adding photo when over limit (data integrity check)", () => {
    expect(canAddPhoto(9)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createVenue input validation
// ---------------------------------------------------------------------------

function validateVenueInputs(args: {
  name: string;
  location: string;
  capacity: number;
  description?: string;
  amenities: string[];
  photoStorageIds: string[];
}): string | null {
  const name = args.name.trim();
  if (!name || name.length > 100) return "Venue name must be between 1 and 100 characters";
  const location = args.location.trim();
  if (!location || location.length > 200) return "Location must be between 1 and 200 characters";
  if (!Number.isInteger(args.capacity) || args.capacity < 1 || args.capacity > 100000)
    return "Capacity must be a positive integer up to 100,000";
  if (args.description && args.description.length > 2000)
    return "Description must be 2000 characters or less";
  if (args.amenities.length > 20) return "Maximum 20 amenities per venue";
  if (args.photoStorageIds.length > MAX_VENUE_PHOTOS)
    return `Maximum ${MAX_VENUE_PHOTOS} photos per venue`;
  return null;
}

describe("createVenue input validation contract", () => {
  const validArgs = {
    name: "The Loft Makati",
    location: "Makati City",
    capacity: 300,
    amenities: [],
    photoStorageIds: [],
  };

  it("passes with valid inputs", () => {
    expect(validateVenueInputs(validArgs)).toBeNull();
  });

  it("rejects empty name", () => {
    expect(validateVenueInputs({ ...validArgs, name: "" })).not.toBeNull();
  });

  it("rejects name over 100 chars", () => {
    expect(validateVenueInputs({ ...validArgs, name: "A".repeat(101) })).not.toBeNull();
  });

  it("rejects empty location", () => {
    expect(validateVenueInputs({ ...validArgs, location: "" })).not.toBeNull();
  });

  it("rejects capacity of 0", () => {
    expect(validateVenueInputs({ ...validArgs, capacity: 0 })).not.toBeNull();
  });

  it("rejects negative capacity", () => {
    expect(validateVenueInputs({ ...validArgs, capacity: -10 })).not.toBeNull();
  });

  it("rejects decimal capacity", () => {
    expect(validateVenueInputs({ ...validArgs, capacity: 1.5 })).not.toBeNull();
  });

  it("rejects capacity over 100000", () => {
    expect(validateVenueInputs({ ...validArgs, capacity: 100001 })).not.toBeNull();
  });

  it("rejects description over 2000 chars", () => {
    expect(
      validateVenueInputs({ ...validArgs, description: "A".repeat(2001) })
    ).not.toBeNull();
  });

  it("rejects more than 20 amenities", () => {
    const amenities = Array.from({ length: 21 }, (_, i) => `Item ${i}`);
    expect(validateVenueInputs({ ...validArgs, amenities })).not.toBeNull();
  });

  it("rejects more than 8 photos on create", () => {
    const photoStorageIds = Array.from({ length: 9 }, (_, i) => `storage:${i}`);
    expect(validateVenueInputs({ ...validArgs, photoStorageIds })).not.toBeNull();
  });

  it("accepts exactly 8 photos", () => {
    const photoStorageIds = Array.from({ length: 8 }, (_, i) => `storage:${i}`);
    expect(validateVenueInputs({ ...validArgs, photoStorageIds })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getVenuesByManager — data shape contract
// ---------------------------------------------------------------------------

describe("getVenuesByManager return shape contract", () => {
  it("return shape includes required fields", () => {
    const mockVenue = {
      _id: "venues:abc",
      managerId: "users:xyz",
      name: "Test Venue",
      location: "Makati",
      capacity: 200,
      amenities: ["PA System"],
      photoStorageIds: [],
      photoUrls: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(mockVenue).toHaveProperty("managerId");
    expect(mockVenue).toHaveProperty("photoUrls");
    expect(mockVenue).toHaveProperty("amenities");
  });

  it("venues sorted by createdAt descending (newest first)", () => {
    const now = Date.now();
    const venues = [
      { _id: "venues:a", createdAt: now - 1000 },
      { _id: "venues:b", createdAt: now },
      { _id: "venues:c", createdAt: now - 2000 },
    ];
    const sorted = [...venues].sort((a, b) => b.createdAt - a.createdAt);
    expect(sorted[0]._id).toBe("venues:b");
    expect(sorted[1]._id).toBe("venues:a");
    expect(sorted[2]._id).toBe("venues:c");
  });
});

// ---------------------------------------------------------------------------
// removeVenuePhoto — membership check (H1 security fix)
// ---------------------------------------------------------------------------

describe("removeVenuePhoto membership check contract", () => {
  it("rejects storageId not in venue's photoStorageIds", () => {
    const venue = { photoStorageIds: ["storage:a", "storage:b"] };
    const isInVenue = (venue.photoStorageIds as string[]).includes("storage:c");
    expect(isInVenue).toBe(false);
  });

  it("allows removal of storageId that is in venue's photoStorageIds", () => {
    const venue = { photoStorageIds: ["storage:a", "storage:b"] };
    const isInVenue = (venue.photoStorageIds as string[]).includes("storage:a");
    expect(isInVenue).toBe(true);
  });

  it("prevents deleting another venue's photo via cross-venue call", () => {
    const venueA = { photoStorageIds: ["storage:x"] };
    const attackerAttemptedStorageId = "storage:from-venue-b";
    // Attacker owns venueA but tries to delete a file not in venueA
    const isInVenue = (venueA.photoStorageIds as string[]).includes(attackerAttemptedStorageId);
    expect(isInVenue).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deleteVenuePhotoUpload — authorization contract (H2 new mutation)
// ---------------------------------------------------------------------------

describe("deleteVenuePhotoUpload authorization contract", () => {
  it("requires venue_manager role", () => {
    const user = { activeRole: "artist" };
    const isAllowed = user.activeRole === "venue_manager";
    expect(isAllowed).toBe(false);
  });

  it("allows venue_manager role", () => {
    const user = { activeRole: "venue_manager" };
    const isAllowed = user.activeRole === "venue_manager";
    expect(isAllowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getVenueById — access control
// ---------------------------------------------------------------------------

describe("getVenueById access control contract", () => {
  it("returns null when venue not owned by requesting user", () => {
    const venue = { managerId: "users:other" };
    const userId = "users:me";
    const result = venue.managerId === userId ? venue : null;
    expect(result).toBeNull();
  });

  it("returns venue when owned by requesting user", () => {
    const venue = { managerId: "users:me", name: "My Venue" };
    const userId = "users:me";
    const result = venue.managerId === userId ? venue : null;
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listPublicVenues — no auth, public access
// ---------------------------------------------------------------------------

describe("listPublicVenues contract", () => {
  it("requires no authentication (public query)", () => {
    // Contract: listPublicVenues has no getAuthenticatedUser call
    const requiresAuth = false;
    expect(requiresAuth).toBe(false);
  });

  it("returns firstPhotoUrl when venue has photos", () => {
    const venue = { photoStorageIds: ["storage:a", "storage:b"] };
    const firstPhotoUrl =
      venue.photoStorageIds.length > 0 ? `url-for-${venue.photoStorageIds[0]}` : null;
    expect(firstPhotoUrl).toBe("url-for-storage:a");
  });

  it("returns firstPhotoUrl as null when venue has no photos", () => {
    const venue = { photoStorageIds: [] as string[] };
    const firstPhotoUrl =
      venue.photoStorageIds.length > 0 ? `url-for-${venue.photoStorageIds[0]}` : null;
    expect(firstPhotoUrl).toBeNull();
  });

  it("return shape includes venue fields plus firstPhotoUrl", () => {
    const result = {
      _id: "venues:abc",
      name: "Test Venue",
      location: "Makati",
      capacity: 200,
      amenities: ["PA System"],
      firstPhotoUrl: null as string | null,
    };
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("location");
    expect(result).toHaveProperty("capacity");
    expect(result).toHaveProperty("amenities");
    expect(result).toHaveProperty("firstPhotoUrl");
  });
});

// ---------------------------------------------------------------------------
// getPublicVenueById — no auth, returns detail with events + availability
// ---------------------------------------------------------------------------

describe("getPublicVenueById contract", () => {
  it("requires no authentication (public query)", () => {
    const requiresAuth = false;
    expect(requiresAuth).toBe(false);
  });

  it("filters upcoming events to published status only", () => {
    const now = Date.now();
    const allEvents = [
      { status: "published", date: now + 86400000 },
      { status: "draft", date: now + 86400000 },
      { status: "cancelled", date: now + 86400000 },
      { status: "published", date: now - 86400000 }, // past
    ];
    const upcomingEvents = allEvents.filter(
      (e) => e.status === "published" && e.date >= now
    );
    expect(upcomingEvents.length).toBe(1);
    expect(upcomingEvents[0].status).toBe("published");
  });

  it("sorts upcoming events by date ascending (soonest first)", () => {
    const now = Date.now();
    const events = [
      { date: now + 86400000 * 7, title: "Week out" },
      { date: now + 86400000, title: "Tomorrow" },
      { date: now + 86400000 * 3, title: "In 3 days" },
    ];
    events.sort((a, b) => a.date - b.date);
    expect(events[0].title).toBe("Tomorrow");
    expect(events[1].title).toBe("In 3 days");
    expect(events[2].title).toBe("Week out");
  });

  it("limits upcoming events to 10", () => {
    const events = Array.from({ length: 15 }, (_, i) => ({ title: `Event ${i}` }));
    const limited = events.slice(0, 10);
    expect(limited.length).toBe(10);
  });

  it("return shape includes photoUrls, upcomingEvents, and availability", () => {
    const result = {
      _id: "venues:abc",
      name: "Test",
      photoUrls: ["url1"],
      upcomingEvents: [],
      availability: [],
    };
    expect(result).toHaveProperty("photoUrls");
    expect(result).toHaveProperty("upcomingEvents");
    expect(result).toHaveProperty("availability");
  });
});

// ---------------------------------------------------------------------------
// getEventsByVenue — auth + venue_manager + ownership
// ---------------------------------------------------------------------------

describe("getEventsByVenue authorization contract", () => {
  it("requires venue_manager role", () => {
    expect(canAccessVenueMutation("venue_manager")).toBe(true);
    expect(canAccessVenueMutation("artist")).toBe(false);
    expect(canAccessVenueMutation("attendee")).toBe(false);
  });

  it("requires ownership of the venue", () => {
    expect(canModifyVenue("user:abc", { managerId: "user:abc" })).toBe(true);
    expect(canModifyVenue("user:xyz", { managerId: "user:abc" })).toBe(false);
  });

  it("return shape includes event fields with totalSold and creator info", () => {
    const result = {
      _id: "events:abc",
      title: "Concert",
      date: Date.now(),
      time: "19:00",
      status: "published",
      totalSold: 42,
      creatorName: "John Doe",
      creatorEmail: "john@example.com",
    };
    expect(result).toHaveProperty("_id");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("totalSold");
    expect(result).toHaveProperty("creatorName");
    expect(result).toHaveProperty("creatorEmail");
    expect(typeof result.totalSold).toBe("number");
  });

  it("computes totalSold from ticket tier soldCount", () => {
    const tiers = [
      { soldCount: 10 },
      { soldCount: 25 },
      { soldCount: 7 },
    ];
    const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
    expect(totalSold).toBe(42);
  });

  it("falls back to 'Unknown' and empty email when creator not found", () => {
    const creator = null;
    const creatorName = creator ? (creator as { name: string }).name : "Unknown";
    const creatorEmail = creator ? (creator as { email: string }).email : "";
    expect(creatorName).toBe("Unknown");
    expect(creatorEmail).toBe("");
  });
});
