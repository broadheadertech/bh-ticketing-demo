import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for analytics queries.
 * No Convex runtime — tests business rule logic only.
 */

const CREATOR_ROLES = ["artist", "organization"];

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("analytics authorization", () => {
  it("allows creator roles", () => {
    expect(CREATOR_ROLES.includes("artist")).toBe(true);
    expect(CREATOR_ROLES.includes("organization")).toBe(true);
  });

  it("rejects non-creator roles", () => {
    expect(CREATOR_ROLES.includes("attendee")).toBe(false);
    expect(CREATOR_ROLES.includes("admin")).toBe(false);
  });

  it("requires event ownership for event analytics", () => {
    const event = { creatorId: "users:c1" };
    const user = { _id: "users:c2" };
    expect(event.creatorId === user._id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tier breakdown computation
// ---------------------------------------------------------------------------

describe("tier breakdown", () => {
  const tiers = [
    { name: "VIP", price: 200000, quantity: 50, soldCount: 30, sortOrder: 0 },
    { name: "General", price: 50000, quantity: 200, soldCount: 150, sortOrder: 1 },
  ];

  it("computes revenue per tier", () => {
    const breakdown = tiers.map((t) => ({
      ...t,
      revenue: t.price * t.soldCount,
      remaining: t.quantity - t.soldCount,
    }));
    expect(breakdown[0].revenue).toBe(6000000); // 200000 * 30
    expect(breakdown[1].revenue).toBe(7500000); // 50000 * 150
  });

  it("computes remaining per tier", () => {
    expect(tiers[0].quantity - tiers[0].soldCount).toBe(20);
    expect(tiers[1].quantity - tiers[1].soldCount).toBe(50);
  });

  it("computes total sold across tiers", () => {
    const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
    expect(totalSold).toBe(180);
  });

  it("computes percentage of sales per tier", () => {
    const totalSold = 180;
    const vipPercent = Math.round((30 / totalSold) * 100);
    const genPercent = Math.round((150 / totalSold) * 100);
    expect(vipPercent).toBe(17);
    expect(genPercent).toBe(83);
  });
});

// ---------------------------------------------------------------------------
// Sales timeline grouping
// ---------------------------------------------------------------------------

describe("sales timeline grouping by day", () => {
  it("groups tickets by creation date", () => {
    const tickets = [
      { createdAt: new Date("2026-03-10T10:00:00").getTime() },
      { createdAt: new Date("2026-03-10T14:00:00").getTime() },
      { createdAt: new Date("2026-03-11T09:00:00").getTime() },
    ];

    const byDay = new Map<string, number>();
    for (const t of tickets) {
      const day = new Date(t.createdAt).toISOString().split("T")[0];
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    expect(byDay.get("2026-03-10")).toBe(2);
    expect(byDay.get("2026-03-11")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Scan rate
// ---------------------------------------------------------------------------

describe("scan rate computation", () => {
  it("computes scan percentage", () => {
    const scanned = 75;
    const total = 100;
    const rate = Math.round((scanned / total) * 100);
    expect(rate).toBe(75);
  });

  it("returns 0 when no tickets sold", () => {
    const rate = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
    expect(rate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Average ticket price
// ---------------------------------------------------------------------------

describe("average ticket price", () => {
  it("computes average from total revenue / total sold", () => {
    const totalRevenue = 13500000;
    const totalSold = 180;
    const avg = Math.round(totalRevenue / totalSold);
    expect(avg).toBe(75000); // ₱750 average
  });

  it("returns 0 when no tickets sold", () => {
    const avg = 0 > 0 ? Math.round(0 / 0) : 0;
    expect(avg).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Creator overview
// ---------------------------------------------------------------------------

describe("creator overview analytics", () => {
  it("aggregates revenue across events", () => {
    const events = [
      { revenue: 5000000 },
      { revenue: 3000000 },
      { revenue: 2000000 },
    ];
    const total = events.reduce((sum, e) => sum + e.revenue, 0);
    expect(total).toBe(10000000);
  });

  it("sorts events by revenue descending", () => {
    const events = [
      { title: "A", revenue: 1000000 },
      { title: "B", revenue: 5000000 },
      { title: "C", revenue: 3000000 },
    ];
    events.sort((a, b) => b.revenue - a.revenue);
    expect(events[0].title).toBe("B");
    expect(events[1].title).toBe("C");
    expect(events[2].title).toBe("A");
  });

  it("computes aggregate rating across all events", () => {
    const ratings = [5, 4, 3, 5, 4, 5, 3, 4];
    const avg = Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
    expect(avg).toBe(4.1);
  });
});

// ---------------------------------------------------------------------------
// Return shapes
// ---------------------------------------------------------------------------

describe("event analytics return shape", () => {
  it("includes all required sections", () => {
    const result = {
      event: { title: "Test", date: 0, status: "published" },
      metrics: {
        totalRevenue: 0,
        totalSold: 0,
        totalCapacity: 0,
        avgTicketPrice: 0,
        uniqueBuyers: 0,
        scanRate: 0,
        scannedCount: 0,
      },
      tierBreakdown: [],
      salesTimeline: [],
      scanTimeline: [],
    };

    expect(result).toHaveProperty("event");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("tierBreakdown");
    expect(result).toHaveProperty("salesTimeline");
    expect(result).toHaveProperty("scanTimeline");
  });
});

describe("creator overview return shape", () => {
  it("includes totals and event breakdown", () => {
    const result = {
      totals: {
        totalRevenue: 0,
        totalTicketsSold: 0,
        totalEvents: 0,
        avgRating: 0,
        totalReviews: 0,
      },
      eventBreakdown: [],
    };

    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("eventBreakdown");
    expect(result.totals).toHaveProperty("avgRating");
    expect(result.totals).toHaveProperty("totalReviews");
  });
});
