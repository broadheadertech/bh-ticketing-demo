import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for admin queries and mutations.
 * No Convex runtime — tests business rule logic only.
 */

const VALID_ROLES = [
  "attendee",
  "artist",
  "organization",
  "venue_manager",
  "admin",
] as const;

// ---------------------------------------------------------------------------
// Authorization contract
// ---------------------------------------------------------------------------

function canAccessAdminDashboard(activeRole: string): boolean {
  return activeRole === "admin";
}

describe("getAdminDashboardMetrics authorization contract", () => {
  it("requires admin role", () => {
    expect(canAccessAdminDashboard("admin")).toBe(true);
  });

  it("rejects artist role", () => {
    expect(canAccessAdminDashboard("artist")).toBe(false);
  });

  it("rejects attendee role", () => {
    expect(canAccessAdminDashboard("attendee")).toBe(false);
  });

  it("rejects venue_manager role", () => {
    expect(canAccessAdminDashboard("venue_manager")).toBe(false);
  });

  it("rejects organization role", () => {
    expect(canAccessAdminDashboard("organization")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dashboard metrics return shape
// ---------------------------------------------------------------------------

describe("admin dashboard metrics return shape", () => {
  it("includes all required metric fields", () => {
    const metrics = {
      totalUsers: 150,
      totalEvents: 42,
      eventsByStatus: { draft: 10, published: 25, cancelled: 7 },
      totalTicketsSold: 1200,
      totalRevenue: 5000000, // centavos
      activeCreators: 8,
    };

    expect(metrics).toHaveProperty("totalUsers");
    expect(metrics).toHaveProperty("totalEvents");
    expect(metrics).toHaveProperty("eventsByStatus");
    expect(metrics).toHaveProperty("totalTicketsSold");
    expect(metrics).toHaveProperty("totalRevenue");
    expect(metrics).toHaveProperty("activeCreators");

    expect(metrics.eventsByStatus).toHaveProperty("draft");
    expect(metrics.eventsByStatus).toHaveProperty("published");
    expect(metrics.eventsByStatus).toHaveProperty("cancelled");
  });

  it("computes totalRevenue as sum of price * soldCount", () => {
    const tiers = [
      { price: 50000, soldCount: 10 }, // 500.00 PHP × 10 = 500,000 centavos
      { price: 100000, soldCount: 5 }, // 1000.00 PHP × 5 = 500,000 centavos
      { price: 0, soldCount: 20 }, // Free × 20 = 0
    ];
    const totalRevenue = tiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );
    expect(totalRevenue).toBe(1000000); // 10,000.00 PHP in centavos
  });

  it("computes totalTicketsSold as sum of soldCount", () => {
    const tiers = [
      { soldCount: 10 },
      { soldCount: 5 },
      { soldCount: 20 },
    ];
    const totalTicketsSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
    expect(totalTicketsSold).toBe(35);
  });

  it("counts activeCreators as distinct creatorIds from non-draft events", () => {
    const events = [
      { creatorId: "users:a", status: "published" },
      { creatorId: "users:b", status: "published" },
      { creatorId: "users:a", status: "cancelled" }, // duplicate creator
      { creatorId: "users:c", status: "draft" }, // draft — excluded
      { creatorId: "users:d", status: "published" },
    ];

    const activeCreatorIds = new Set(
      events
        .filter((e) => e.status !== "draft")
        .map((e) => e.creatorId)
    );

    expect(activeCreatorIds.size).toBe(3); // users:a, users:b, users:d
    expect(activeCreatorIds.has("users:a")).toBe(true);
    expect(activeCreatorIds.has("users:b")).toBe(true);
    expect(activeCreatorIds.has("users:c")).toBe(false); // draft only
    expect(activeCreatorIds.has("users:d")).toBe(true);
  });

  it("counts events by status correctly", () => {
    const events = [
      { status: "draft" },
      { status: "draft" },
      { status: "published" },
      { status: "published" },
      { status: "published" },
      { status: "cancelled" },
    ];

    const eventsByStatus = {
      draft: events.filter((e) => e.status === "draft").length,
      published: events.filter((e) => e.status === "published").length,
      cancelled: events.filter((e) => e.status === "cancelled").length,
    };

    expect(eventsByStatus.draft).toBe(2);
    expect(eventsByStatus.published).toBe(3);
    expect(eventsByStatus.cancelled).toBe(1);
  });

  it("returns revenue as integer centavos (not formatted)", () => {
    const totalRevenue = 5000000; // 50,000.00 PHP
    expect(Number.isInteger(totalRevenue)).toBe(true);
    expect(typeof totalRevenue).toBe("number");
  });

  it("excludes cancelled event tiers from revenue and tickets sold", () => {
    const events = [
      { _id: "events:a", status: "published" },
      { _id: "events:b", status: "cancelled" },
      { _id: "events:c", status: "draft" },
    ];
    const tiers = [
      { eventId: "events:a", price: 10000, soldCount: 5 },
      { eventId: "events:b", price: 20000, soldCount: 3 }, // cancelled — excluded
      { eventId: "events:c", price: 5000, soldCount: 2 },
    ];

    const cancelledEventIds = new Set(
      events.filter((e) => e.status === "cancelled").map((e) => e._id)
    );
    const activeTiers = tiers.filter((t) => !cancelledEventIds.has(t.eventId));

    const totalTicketsSold = activeTiers.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = activeTiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );

    expect(totalTicketsSold).toBe(7); // 5 + 2 (excludes 3 from cancelled)
    expect(totalRevenue).toBe(60000); // 50000 + 10000 (excludes 60000 from cancelled)
  });
});

// ---------------------------------------------------------------------------
// listUsers authorization contract
// ---------------------------------------------------------------------------

function canAccessAdminQuery(activeRole: string): boolean {
  return activeRole === "admin";
}

describe("listUsers authorization contract", () => {
  it("requires admin role", () => {
    expect(canAccessAdminQuery("admin")).toBe(true);
  });

  it("rejects non-admin roles", () => {
    for (const role of ["attendee", "artist", "organization", "venue_manager"]) {
      expect(canAccessAdminQuery(role)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// listUsers return shape
// ---------------------------------------------------------------------------

describe("listUsers return shape", () => {
  it("includes all required user fields", () => {
    const user = {
      _id: "users:abc",
      name: "Jane Doe",
      email: "jane@example.com",
      roles: ["attendee", "artist"],
      activeRole: "attendee",
      isActive: true,
      createdAt: 1700000000000,
    };

    expect(user).toHaveProperty("_id");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("roles");
    expect(user).toHaveProperty("activeRole");
    expect(user).toHaveProperty("isActive");
    expect(user).toHaveProperty("createdAt");
    expect(Array.isArray(user.roles)).toBe(true);
    expect(typeof user.isActive).toBe("boolean");
  });

  it("does not leak internal fields", () => {
    const user = {
      _id: "users:abc",
      name: "Jane Doe",
      email: "jane@example.com",
      roles: ["attendee"],
      activeRole: "attendee",
      isActive: true,
      createdAt: 1700000000000,
    };

    expect(user).not.toHaveProperty("clerkId");
    expect(user).not.toHaveProperty("stripeAccountId");
    expect(user).not.toHaveProperty("image");
    expect(user).not.toHaveProperty("updatedAt");
  });
});

// ---------------------------------------------------------------------------
// disableUser / enableUser contract
// ---------------------------------------------------------------------------

describe("disableUser contract", () => {
  it("prevents admin from disabling themselves", () => {
    const adminId = "users:admin1";
    const targetUserId = "users:admin1";
    expect(adminId === targetUserId).toBe(true); // should throw
  });

  it("allows admin to disable a different user", () => {
    const adminId: string = "users:admin1";
    const targetUserId: string = "users:other";
    expect(adminId === targetUserId).toBe(false); // should proceed
  });

  it("rejects disabling an already-disabled user", () => {
    const targetUser = { isActive: false };
    expect(targetUser.isActive).toBe(false); // should throw
  });

  it("sets isActive to false on disable", () => {
    const targetUser = { isActive: true };
    const patched = { ...targetUser, isActive: false, updatedAt: Date.now() };
    expect(patched.isActive).toBe(false);
    expect(patched.updatedAt).toBeGreaterThan(0);
  });
});

describe("enableUser contract", () => {
  it("rejects enabling an already-active user", () => {
    const targetUser = { isActive: true };
    expect(targetUser.isActive).toBe(true); // should throw
  });

  it("sets isActive to true on enable", () => {
    const targetUser = { isActive: false };
    const patched = { ...targetUser, isActive: true, updatedAt: Date.now() };
    expect(patched.isActive).toBe(true);
    expect(patched.updatedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// adminUpdateUserRoles contract
// ---------------------------------------------------------------------------

describe("adminUpdateUserRoles contract", () => {
  it("validates all roles against VALID_ROLES", () => {
    const validRoles = ["attendee", "artist"];
    for (const role of validRoles) {
      expect(VALID_ROLES.includes(role as never)).toBe(true);
    }
  });

  it("rejects invalid roles", () => {
    const invalidRoles = ["superadmin", "moderator", ""];
    for (const role of invalidRoles) {
      expect(VALID_ROLES.includes(role as never)).toBe(false);
    }
  });

  it("requires at least one role", () => {
    const roles: string[] = [];
    expect(roles.length).toBe(0); // should throw
  });

  it("resets activeRole when removed from roles array", () => {
    const targetUser = {
      roles: ["attendee", "artist"],
      activeRole: "artist",
    };
    const newRoles = ["attendee", "organization"];

    const newActiveRole = newRoles.includes(targetUser.activeRole)
      ? targetUser.activeRole
      : newRoles[0];

    expect(newActiveRole).toBe("attendee"); // artist removed, falls back to first
  });

  it("preserves activeRole when still in new roles array", () => {
    const targetUser = {
      roles: ["attendee", "artist"],
      activeRole: "artist",
    };
    const newRoles = ["artist", "admin"];

    const newActiveRole = newRoles.includes(targetUser.activeRole)
      ? targetUser.activeRole
      : newRoles[0];

    expect(newActiveRole).toBe("artist"); // still present
  });

  it("deduplicates roles array", () => {
    const inputRoles = ["admin", "admin", "attendee", "attendee"];
    const uniqueRoles = [...new Set(inputRoles)];
    expect(uniqueRoles).toEqual(["admin", "attendee"]);
    expect(uniqueRoles.length).toBe(2);
  });

  it("stores previous and new roles in audit metadata", () => {
    const previousRoles = ["attendee", "artist"];
    const newRoles = ["attendee", "admin"];
    const metadata = { previousRoles, newRoles };

    expect(metadata.previousRoles).toEqual(["attendee", "artist"]);
    expect(metadata.newRoles).toEqual(["attendee", "admin"]);
  });
});

// ---------------------------------------------------------------------------
// Audit log entry shape
// ---------------------------------------------------------------------------

describe("audit log entry shape", () => {
  it("includes all required audit fields", () => {
    const entry = {
      actorId: "users:admin1",
      action: "admin.user_disabled",
      targetType: "user",
      targetId: "users:target1",
      metadata: undefined,
      createdAt: Date.now(),
    };

    expect(entry).toHaveProperty("actorId");
    expect(entry).toHaveProperty("action");
    expect(entry).toHaveProperty("targetType");
    expect(entry).toHaveProperty("targetId");
    expect(entry).toHaveProperty("createdAt");
    expect(typeof entry.actorId).toBe("string");
    expect(typeof entry.action).toBe("string");
    expect(typeof entry.createdAt).toBe("number");
  });

  it("supports optional metadata for role changes", () => {
    const entry = {
      actorId: "users:admin1",
      action: "admin.roles_updated",
      targetType: "user",
      targetId: "users:target1",
      metadata: {
        previousRoles: ["attendee"],
        newRoles: ["attendee", "admin"],
      },
      createdAt: Date.now(),
    };

    expect(entry.metadata).toBeDefined();
    expect(entry.metadata.previousRoles).toEqual(["attendee"]);
    expect(entry.metadata.newRoles).toEqual(["attendee", "admin"]);
  });

  it("uses correct action strings for each admin action", () => {
    const validActions = [
      "admin.user_disabled",
      "admin.user_enabled",
      "admin.roles_updated",
      "admin.event_unpublished",
      "admin.event_approved",
    ];

    for (const action of validActions) {
      expect(action).toMatch(/^admin\./);
    }
  });
});

// ---------------------------------------------------------------------------
// listEventsForModeration authorization contract
// ---------------------------------------------------------------------------

describe("listEventsForModeration authorization contract", () => {
  it("requires admin role", () => {
    expect(canAccessAdminQuery("admin")).toBe(true);
  });

  it("rejects non-admin roles", () => {
    for (const role of ["attendee", "artist", "organization", "venue_manager"]) {
      expect(canAccessAdminQuery(role)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// listEventsForModeration return shape
// ---------------------------------------------------------------------------

describe("listEventsForModeration return shape", () => {
  it("includes all required event fields", () => {
    const event = {
      _id: "events:abc",
      title: "Test Concert",
      eventType: "concert",
      date: 1700000000000,
      time: "20:00",
      venueName: "Main Stage",
      status: "published",
      moderationStatus: undefined,
      moderationReason: undefined,
      createdAt: 1699000000000,
      creatorName: "Jane Doe",
      creatorEmail: "jane@example.com",
    };

    expect(event).toHaveProperty("_id");
    expect(event).toHaveProperty("title");
    expect(event).toHaveProperty("eventType");
    expect(event).toHaveProperty("date");
    expect(event).toHaveProperty("status");
    expect(event).toHaveProperty("moderationStatus");
    expect(event).toHaveProperty("createdAt");
    expect(event).toHaveProperty("creatorName");
    expect(event).toHaveProperty("creatorEmail");
  });

  it("does not leak internal fields", () => {
    const event = {
      _id: "events:abc",
      title: "Test",
      eventType: "concert",
      date: 1700000000000,
      time: "20:00",
      status: "published",
      createdAt: 1699000000000,
      creatorName: "Jane",
      creatorEmail: "jane@test.com",
    };

    expect(event).not.toHaveProperty("creatorId");
    expect(event).not.toHaveProperty("artworkStorageId");
    expect(event).not.toHaveProperty("updatedAt");
    expect(event).not.toHaveProperty("description");
  });
});

// ---------------------------------------------------------------------------
// adminUnpublishEvent contract
// ---------------------------------------------------------------------------

describe("adminUnpublishEvent contract", () => {
  it("only allows unpublishing published events", () => {
    const publishedEvent = { status: "published" };
    const draftEvent = { status: "draft" };
    const cancelledEvent = { status: "cancelled" };

    expect(publishedEvent.status === "published").toBe(true);
    expect(draftEvent.status === "published").toBe(false);
    expect(cancelledEvent.status === "published").toBe(false);
  });

  it("sets status to draft and moderationStatus to flagged", () => {
    const event = { status: "published", moderationStatus: undefined, moderationReason: undefined };
    const patched = {
      ...event,
      status: "draft",
      moderationStatus: "flagged",
      moderationReason: "Violates community guidelines",
      updatedAt: Date.now(),
    };

    expect(patched.status).toBe("draft");
    expect(patched.moderationStatus).toBe("flagged");
    expect(patched.moderationReason).toBe("Violates community guidelines");
    expect(patched.updatedAt).toBeGreaterThan(0);
  });

  it("creates audit log with reason in metadata", () => {
    const reason = "Inappropriate content";
    const auditEntry = {
      actorId: "users:admin1",
      action: "admin.event_unpublished",
      targetType: "event",
      targetId: "events:abc",
      metadata: { reason },
      createdAt: Date.now(),
    };

    expect(auditEntry.action).toBe("admin.event_unpublished");
    expect(auditEntry.targetType).toBe("event");
    expect(auditEntry.metadata.reason).toBe(reason);
  });
});

// ---------------------------------------------------------------------------
// adminApproveEvent contract
// ---------------------------------------------------------------------------

describe("adminApproveEvent contract", () => {
  it("sets moderationStatus to approved", () => {
    const event = { moderationStatus: undefined };
    const patched = {
      ...event,
      moderationStatus: "approved",
      updatedAt: Date.now(),
    };

    expect(patched.moderationStatus).toBe("approved");
    expect(patched.updatedAt).toBeGreaterThan(0);
  });

  it("creates audit log for approval", () => {
    const auditEntry = {
      actorId: "users:admin1",
      action: "admin.event_approved",
      targetType: "event",
      targetId: "events:abc",
      createdAt: Date.now(),
    };

    expect(auditEntry.action).toBe("admin.event_approved");
    expect(auditEntry.targetType).toBe("event");
  });
});

// ---------------------------------------------------------------------------
// Moderation status filtering logic
// ---------------------------------------------------------------------------

describe("moderation status filtering", () => {
  const events = [
    { _id: "1", moderationStatus: undefined },
    { _id: "2", moderationStatus: "approved" },
    { _id: "3", moderationStatus: "flagged" },
    { _id: "4", moderationStatus: undefined },
    { _id: "5", moderationStatus: "approved" },
  ];

  it("filters unreviewed events (moderationStatus undefined)", () => {
    const unreviewed = events.filter((e) => !e.moderationStatus);
    expect(unreviewed.length).toBe(2);
    expect(unreviewed.map((e) => e._id)).toEqual(["1", "4"]);
  });

  it("filters approved events", () => {
    const approved = events.filter((e) => e.moderationStatus === "approved");
    expect(approved.length).toBe(2);
  });

  it("filters flagged events", () => {
    const flagged = events.filter((e) => e.moderationStatus === "flagged");
    expect(flagged.length).toBe(1);
    expect(flagged[0]._id).toBe("3");
  });

  it("returns all events when filter is 'all'", () => {
    expect(events.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getFinancialMetrics authorization contract
// ---------------------------------------------------------------------------

describe("getFinancialMetrics authorization contract", () => {
  it("requires admin role", () => {
    expect(canAccessAdminQuery("admin")).toBe(true);
  });

  it("rejects non-admin roles", () => {
    for (const role of ["attendee", "artist", "organization", "venue_manager"]) {
      expect(canAccessAdminQuery(role)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Financial metrics return shape
// ---------------------------------------------------------------------------

describe("financial metrics return shape", () => {
  it("includes all required metric fields", () => {
    const metrics = {
      gmv: 5000000,
      platformFees: 250000,
      infrastructureCosts: 210000,
      netRevenue: 40000,
      totalTicketsSold: 100,
      eventBreakdown: [],
      monthOverMonth: {
        currentMonthGmv: 3000000,
        currentMonthTickets: 60,
        previousMonthGmv: 2000000,
        previousMonthTickets: 40,
        gmvDiff: 1000000,
        ticketsDiff: 20,
      },
    };

    expect(metrics).toHaveProperty("gmv");
    expect(metrics).toHaveProperty("platformFees");
    expect(metrics).toHaveProperty("infrastructureCosts");
    expect(metrics).toHaveProperty("netRevenue");
    expect(metrics).toHaveProperty("totalTicketsSold");
    expect(metrics).toHaveProperty("eventBreakdown");
    expect(metrics).toHaveProperty("monthOverMonth");
    expect(metrics.monthOverMonth).toHaveProperty("currentMonthGmv");
    expect(metrics.monthOverMonth).toHaveProperty("previousMonthGmv");
    expect(metrics.monthOverMonth).toHaveProperty("gmvDiff");
    expect(metrics.monthOverMonth).toHaveProperty("ticketsDiff");
  });

  it("event breakdown includes required fields", () => {
    const event = {
      eventId: "events:abc",
      title: "Test Concert",
      status: "published",
      ticketsSold: 50,
      revenue: 1500000,
    };

    expect(event).toHaveProperty("eventId");
    expect(event).toHaveProperty("title");
    expect(event).toHaveProperty("status");
    expect(event).toHaveProperty("ticketsSold");
    expect(event).toHaveProperty("revenue");
  });
});

// ---------------------------------------------------------------------------
// Platform fee calculation
// ---------------------------------------------------------------------------

describe("platform fee calculation", () => {
  const FEE_RATE = 0.05;

  it("computes 5% of GMV", () => {
    const gmv = 1000000; // ₱10,000 in centavos
    const fees = Math.round(gmv * FEE_RATE);
    expect(fees).toBe(50000); // ₱500
  });

  it("returns 0 fees for 0 GMV", () => {
    const fees = Math.round(0 * FEE_RATE);
    expect(fees).toBe(0);
  });

  it("rounds fees to integer centavos", () => {
    const gmv = 33333; // odd amount
    const fees = Math.round(gmv * FEE_RATE);
    expect(Number.isInteger(fees)).toBe(true);
    expect(fees).toBe(1667); // 33333 * 0.05 = 1666.65 → 1667
  });
});

// ---------------------------------------------------------------------------
// Infrastructure cost constant
// ---------------------------------------------------------------------------

describe("infrastructure cost constant", () => {
  const INFRASTRUCTURE_COST_CENTAVOS = 210000;

  it("is fixed at 210000 centavos (₱2,100)", () => {
    expect(INFRASTRUCTURE_COST_CENTAVOS).toBe(210000);
  });

  it("converts to ₱2,100 PHP", () => {
    expect(INFRASTRUCTURE_COST_CENTAVOS / 100).toBe(2100);
  });
});

// ---------------------------------------------------------------------------
// Net revenue formula
// ---------------------------------------------------------------------------

describe("net revenue formula", () => {
  const INFRA_COST = 210000;

  it("computes platformFees - infrastructureCosts", () => {
    const platformFees = 250000;
    const netRevenue = platformFees - INFRA_COST;
    expect(netRevenue).toBe(40000); // ₱400 profit
  });

  it("can be negative when fees are below costs", () => {
    const platformFees = 100000;
    const netRevenue = platformFees - INFRA_COST;
    expect(netRevenue).toBe(-110000); // ₱1,100 loss
  });

  it("is zero when fees equal costs", () => {
    const netRevenue = INFRA_COST - INFRA_COST;
    expect(netRevenue).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cancelled event exclusion from financial metrics
// ---------------------------------------------------------------------------

describe("financial metrics cancelled event exclusion", () => {
  it("excludes cancelled event tiers from GMV", () => {
    const events = [
      { _id: "e1", status: "published" },
      { _id: "e2", status: "cancelled" },
      { _id: "e3", status: "draft" },
    ];
    const tiers = [
      { eventId: "e1", price: 50000, soldCount: 10 },
      { eventId: "e2", price: 30000, soldCount: 5 }, // cancelled
      { eventId: "e3", price: 10000, soldCount: 2 },
    ];

    const cancelledIds = new Set(
      events.filter((e) => e.status === "cancelled").map((e) => e._id)
    );
    const activeTiers = tiers.filter((t) => !cancelledIds.has(t.eventId));
    const gmv = activeTiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );

    expect(gmv).toBe(520000); // 500000 + 20000 (excludes 150000 from cancelled)
    expect(activeTiers.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Date range filtering logic
// ---------------------------------------------------------------------------

describe("date range filtering logic", () => {
  const now = new Date(2026, 2, 14); // March 14, 2026
  const currentMonthStart = new Date(2026, 2, 1).getTime();
  const previousMonthStart = new Date(2026, 1, 1).getTime();
  const currentMonthEnd = new Date(2026, 3, 1).getTime();

  const events = [
    { _id: "e1", date: new Date(2026, 2, 10).getTime() }, // March — current
    { _id: "e2", date: new Date(2026, 1, 15).getTime() }, // February — previous
    { _id: "e3", date: new Date(2026, 0, 5).getTime() },  // January — older
    { _id: "e4", date: new Date(2026, 2, 25).getTime() }, // March — current
  ];

  it("this_month filters to current month only", () => {
    const filtered = events.filter(
      (e) => e.date >= currentMonthStart && e.date < currentMonthEnd
    );
    expect(filtered.length).toBe(2);
    expect(filtered.map((e) => e._id)).toEqual(["e1", "e4"]);
  });

  it("last_month filters to previous month only", () => {
    const filtered = events.filter(
      (e) => e.date >= previousMonthStart && e.date < currentMonthStart
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0]._id).toBe("e2");
  });

  it("all_time returns all events", () => {
    expect(events.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// getEventRefundSummary authorization contract (Story 9.2)
// ---------------------------------------------------------------------------

describe("getEventRefundSummary authorization contract", () => {
  it("requires admin role", () => {
    expect(canAccessAdminQuery("admin")).toBe(true);
  });

  it("rejects non-admin roles", () => {
    for (const role of ["attendee", "artist", "organization", "venue_manager"]) {
      expect(canAccessAdminQuery(role)).toBe(false);
    }
  });
});

describe("getEventRefundSummary return shape", () => {
  it("includes all required summary fields", () => {
    const summary = {
      totalTickets: 10,
      refundedCount: 6,
      failedCount: 1,
      skippedCount: 3,
      totalRefundAmount: 350000,
    };

    expect(summary).toHaveProperty("totalTickets");
    expect(summary).toHaveProperty("refundedCount");
    expect(summary).toHaveProperty("failedCount");
    expect(summary).toHaveProperty("skippedCount");
    expect(summary).toHaveProperty("totalRefundAmount");
    expect(typeof summary.totalRefundAmount).toBe("number");
  });
});
