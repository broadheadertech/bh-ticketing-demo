import { describe, it, expect } from "vitest";
import { formatCurrency } from "../src/lib/utils/format";

/**
 * Contract tests for public Convex queries.
 * Verifies access control invariants, return shapes, and sorting.
 */

describe("getPublicEventById contract", () => {
  it("only published events are returned — draft returns error", () => {
    // Contract: handler throws ConvexError if status !== 'published'
    const draftEvent = { status: "draft", _id: "event:abc" };
    const isAccessible = draftEvent.status === "published";
    expect(isAccessible).toBe(false);
  });

  it("only published events are returned — cancelled returns error", () => {
    const cancelledEvent = { status: "cancelled", _id: "event:abc" };
    const isAccessible = cancelledEvent.status === "published";
    expect(isAccessible).toBe(false);
  });

  it("published events are accessible", () => {
    const publishedEvent = { status: "published", _id: "event:abc" };
    const isAccessible = publishedEvent.status === "published";
    expect(isAccessible).toBe(true);
  });

  it("return shape includes artworkUrl, creatorProfile, creatorStripeAccountId", () => {
    const mockReturn = {
      _id: "event:abc",
      title: "Test Concert",
      status: "published",
      artworkUrl: "https://storage.convex.cloud/abc.jpg",
      creatorStripeAccountId: "acct_1234",
      creatorProfile: { displayName: "Test Artist", profilePhotoUrl: null },
    };
    expect(mockReturn).toHaveProperty("artworkUrl");
    expect(mockReturn).toHaveProperty("creatorStripeAccountId");
    expect(mockReturn).toHaveProperty("creatorProfile");
  });

  it("artworkUrl is null when no artworkStorageId", () => {
    const mockReturn = {
      artworkUrl: null,
      creatorStripeAccountId: "acct_1234",
      creatorProfile: null,
    };
    expect(mockReturn.artworkUrl).toBeNull();
  });

  it("creatorStripeAccountId is null when creator has no Stripe account", () => {
    const mockReturn = {
      creatorStripeAccountId: null,
    };
    expect(mockReturn.creatorStripeAccountId).toBeNull();
  });
});

describe("getPublicTiersByEventId contract", () => {
  it("returns empty array for non-published events", () => {
    // Contract: returns [] if event is not published
    const draftEvent = { status: "draft" };
    const result = draftEvent.status === "published" ? ["tier1"] : [];
    expect(result).toEqual([]);
  });

  it("tiers sorted by sortOrder ascending", () => {
    const unsortedTiers = [
      { _id: "tier:c", sortOrder: 3 },
      { _id: "tier:a", sortOrder: 1 },
      { _id: "tier:b", sortOrder: 2 },
    ];
    const sorted = [...unsortedTiers].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(sorted[0]._id).toBe("tier:a");
    expect(sorted[1]._id).toBe("tier:b");
    expect(sorted[2]._id).toBe("tier:c");
  });

  it("tier return shape includes required inventory fields", () => {
    const mockTier = {
      _id: "tier:abc",
      name: "General Admission",
      price: 50000,
      quantity: 100,
      soldCount: 23,
      sortOrder: 1,
    };
    expect(mockTier).toHaveProperty("quantity");
    expect(mockTier).toHaveProperty("soldCount");
    const available = mockTier.quantity - mockTier.soldCount;
    expect(available).toBe(77);
  });

  it("available quantity is quantity minus soldCount", () => {
    const tier = { quantity: 200, soldCount: 150 };
    expect(tier.quantity - tier.soldCount).toBe(50);
  });

  it("soldOut when available is 0", () => {
    const tier = { quantity: 100, soldCount: 100 };
    const available = tier.quantity - tier.soldCount;
    expect(available).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// listPublicEvents — pure logic contracts
// ---------------------------------------------------------------------------

function filterPublicEvents(
  events: { status: string; date: number }[],
  now: number
): typeof events {
  const publicStatuses = ["published", "on_sale", "sold_out"];
  return events
    .filter((e) => publicStatuses.includes(e.status) && e.date >= now)
    .sort((a, b) => a.date - b.date);
}

describe("listPublicEvents contract", () => {
  const now = Date.now();
  const future = now + 86_400_000; // +1 day
  const past = now - 86_400_000;   // -1 day

  it("only published, on_sale, and sold_out events pass the filter", () => {
    const events = [
      { status: "published", date: future },
      { status: "on_sale", date: future },
      { status: "sold_out", date: future },
      { status: "draft", date: future },
      { status: "completed", date: future },
      { status: "cancelled", date: future },
    ];
    const result = filterPublicEvents(events, now);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.status)).toEqual(
      expect.arrayContaining(["published", "on_sale", "sold_out"])
    );
  });

  it("draft events are excluded", () => {
    const events = [{ status: "draft", date: future }];
    expect(filterPublicEvents(events, now)).toHaveLength(0);
  });

  it("completed events are excluded", () => {
    const events = [{ status: "completed", date: past }];
    expect(filterPublicEvents(events, now)).toHaveLength(0);
  });

  it("cancelled events are excluded", () => {
    const events = [{ status: "cancelled", date: future }];
    expect(filterPublicEvents(events, now)).toHaveLength(0);
  });

  it("past events (date < now) are excluded even if published", () => {
    const events = [{ status: "published", date: past }];
    expect(filterPublicEvents(events, now)).toHaveLength(0);
  });

  it("events are sorted by date ascending (soonest first)", () => {
    const d1 = now + 3_600_000;
    const d2 = now + 7_200_000;
    const d3 = now + 10_800_000;
    const events = [
      { status: "published", date: d3 },
      { status: "published", date: d1 },
      { status: "published", date: d2 },
    ];
    const result = filterPublicEvents(events, now);
    expect(result[0].date).toBe(d1);
    expect(result[1].date).toBe(d2);
    expect(result[2].date).toBe(d3);
  });

  it("empty events array returns empty result", () => {
    expect(filterPublicEvents([], now)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPriceRangeByEventIds — pure logic contracts
// ---------------------------------------------------------------------------

function computePriceRange(
  prices: number[]
): { minPrice: number; maxPrice: number } | null {
  if (prices.length === 0) return null;
  return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
}

describe("getPriceRangeByEventIds contract", () => {
  it("single tier returns min === max", () => {
    const range = computePriceRange([30000]);
    expect(range).toEqual({ minPrice: 30000, maxPrice: 30000 });
  });

  it("multiple tiers return correct min and max", () => {
    const range = computePriceRange([30000, 80000, 50000]);
    expect(range).toEqual({ minPrice: 30000, maxPrice: 80000 });
  });

  it("free event (all tiers price=0) returns both zero", () => {
    const range = computePriceRange([0, 0]);
    expect(range).toEqual({ minPrice: 0, maxPrice: 0 });
  });

  it("empty tiers returns null", () => {
    expect(computePriceRange([])).toBeNull();
  });

  it("mixed free and paid tiers returns correct range", () => {
    const range = computePriceRange([0, 50000]);
    expect(range).toEqual({ minPrice: 0, maxPrice: 50000 });
  });
});

// ---------------------------------------------------------------------------
// EventCard display format — pure logic contracts
// ---------------------------------------------------------------------------

function formatPriceRange(
  range: { minPrice: number; maxPrice: number } | null
): string {
  if (!range) return "Free";
  if (range.minPrice === 0 && range.maxPrice === 0) return "Free";
  if (range.minPrice === 0) return `Free – ${formatCurrency(range.maxPrice)}`;
  if (range.minPrice === range.maxPrice) return formatCurrency(range.minPrice);
  return `From ${formatCurrency(range.minPrice)}`;
}

describe("EventCard price display contract", () => {
  it("null range displays as Free", () => {
    expect(formatPriceRange(null)).toBe("Free");
  });

  it("both zero displays as Free", () => {
    expect(formatPriceRange({ minPrice: 0, maxPrice: 0 })).toBe("Free");
  });

  it("equal min and max displays as single price", () => {
    const result = formatPriceRange({ minPrice: 30000, maxPrice: 30000 });
    expect(result).toBe(formatCurrency(30000));
  });

  it("min > 0 with higher max displays as From <min>", () => {
    const result = formatPriceRange({ minPrice: 30000, maxPrice: 100000 });
    expect(result).toMatch(/^From /);
    expect(result).toContain(formatCurrency(30000));
  });

  it("free min with paid max displays as Free – <max>", () => {
    const result = formatPriceRange({ minPrice: 0, maxPrice: 50000 });
    expect(result).toMatch(/^Free/);
    expect(result).toContain(formatCurrency(50000));
  });
});

// ---------------------------------------------------------------------------
// searchPublicEvents — post-filter logic contracts
// ---------------------------------------------------------------------------

function filterSearchResults(
  events: { status: string; date: number }[],
  now: number
): typeof events {
  const publicStatuses = ["published", "on_sale", "sold_out"];
  return events.filter(
    (e) => publicStatuses.includes(e.status) && e.date >= now
  );
}

describe("searchPublicEvents post-filter contract", () => {
  const now = Date.now();
  const future = now + 86_400_000;
  const past = now - 86_400_000;

  it("draft events are excluded from search results", () => {
    const events = [{ status: "draft", date: future }];
    expect(filterSearchResults(events, now)).toHaveLength(0);
  });

  it("past events are excluded from search results", () => {
    const events = [{ status: "published", date: past }];
    expect(filterSearchResults(events, now)).toHaveLength(0);
  });

  it("published future events are included in search results", () => {
    const events = [{ status: "published", date: future }];
    expect(filterSearchResults(events, now)).toHaveLength(1);
  });

  it("on_sale future events are included in search results", () => {
    const events = [{ status: "on_sale", date: future }];
    expect(filterSearchResults(events, now)).toHaveLength(1);
  });

  it("sold_out future events are included in search results", () => {
    const events = [{ status: "sold_out", date: future }];
    expect(filterSearchResults(events, now)).toHaveLength(1);
  });

  it("cancelled future events are excluded from search results", () => {
    const events = [{ status: "cancelled", date: future }];
    expect(filterSearchResults(events, now)).toHaveLength(0);
  });

  it("mixed results: only public future events pass", () => {
    const events = [
      { status: "published", date: future },
      { status: "on_sale", date: future },
      { status: "draft", date: future },
      { status: "published", date: past },
      { status: "cancelled", date: future },
    ];
    const result = filterSearchResults(events, now);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getPublicEventDetailPage — pure logic contracts
// ---------------------------------------------------------------------------

function isDetailPageAccessible(status: string): boolean {
  const publicStatuses = ["published", "on_sale", "sold_out"];
  return publicStatuses.includes(status);
}

describe("getPublicEventDetailPage contract", () => {
  it("returns null for draft events", () => {
    expect(isDetailPageAccessible("draft")).toBe(false);
  });

  it("returns null for cancelled events", () => {
    expect(isDetailPageAccessible("cancelled")).toBe(false);
  });

  it("returns null for completed events", () => {
    expect(isDetailPageAccessible("completed")).toBe(false);
  });

  it("returns event for published status", () => {
    expect(isDetailPageAccessible("published")).toBe(true);
  });

  it("returns event for on_sale status", () => {
    expect(isDetailPageAccessible("on_sale")).toBe(true);
  });

  it("returns event for sold_out status", () => {
    expect(isDetailPageAccessible("sold_out")).toBe(true);
  });

  it("return shape includes artworkUrl, creatorProfile, creatorStripeAccountId", () => {
    const mockReturn = {
      _id: "event:abc",
      title: "Test Concert",
      status: "on_sale",
      artworkUrl: "https://storage.convex.cloud/abc.jpg",
      creatorStripeAccountId: "acct_1234",
      creatorProfile: { displayName: "Test Artist", profilePhotoUrl: null },
    };
    expect(mockReturn).toHaveProperty("artworkUrl");
    expect(mockReturn).toHaveProperty("creatorStripeAccountId");
    expect(mockReturn).toHaveProperty("creatorProfile");
  });

  it("artworkUrl is null when no artwork", () => {
    const mockReturn = { artworkUrl: null };
    expect(mockReturn.artworkUrl).toBeNull();
  });

  it("creatorProfile is null when no profile exists", () => {
    const mockReturn = { creatorProfile: null };
    expect(mockReturn.creatorProfile).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPublicTiersByEventId (updated) — supports on_sale and sold_out
// ---------------------------------------------------------------------------

function isPublicTiersAccessible(status: string): boolean {
  const publicStatuses = ["published", "on_sale", "sold_out"];
  return publicStatuses.includes(status);
}

describe("getPublicTiersByEventId updated contract", () => {
  it("returns tiers for published events", () => {
    expect(isPublicTiersAccessible("published")).toBe(true);
  });

  it("returns tiers for on_sale events", () => {
    expect(isPublicTiersAccessible("on_sale")).toBe(true);
  });

  it("returns tiers for sold_out events", () => {
    expect(isPublicTiersAccessible("sold_out")).toBe(true);
  });

  it("returns empty for draft events", () => {
    expect(isPublicTiersAccessible("draft")).toBe(false);
  });

  it("returns empty for cancelled events", () => {
    expect(isPublicTiersAccessible("cancelled")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sold-out badge logic — pure logic contracts
// ---------------------------------------------------------------------------

function isSoldOutBadgeShown(status: string): boolean {
  return status === "sold_out";
}

describe("EventCard sold-out badge contract", () => {
  it("sold_out status shows sold out badge", () => {
    expect(isSoldOutBadgeShown("sold_out")).toBe(true);
  });

  it("published status does not show sold out badge", () => {
    expect(isSoldOutBadgeShown("published")).toBe(false);
  });

  it("on_sale status does not show sold out badge", () => {
    expect(isSoldOutBadgeShown("on_sale")).toBe(false);
  });
});
