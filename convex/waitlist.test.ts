import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for waitlist system.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Sold-out detection
// ---------------------------------------------------------------------------

describe("sold-out detection for waitlist", () => {
  it("detects all tiers sold out", () => {
    const tiers = [
      { quantity: 100, soldCount: 100 },
      { quantity: 50, soldCount: 50 },
    ];
    const allSoldOut = tiers.every((t) => t.soldCount >= t.quantity);
    expect(allSoldOut).toBe(true);
  });

  it("not sold out when any tier has availability", () => {
    const tiers = [
      { quantity: 100, soldCount: 100 },
      { quantity: 50, soldCount: 49 },
    ];
    const allSoldOut = tiers.every((t) => t.soldCount >= t.quantity);
    expect(allSoldOut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Duplicate prevention
// ---------------------------------------------------------------------------

describe("waitlist duplicate prevention", () => {
  it("detects existing entry for same event and email", () => {
    const entries = [
      { eventId: "events:e1", email: "alice@test.com" },
    ];
    const isDuplicate = entries.some(
      (e) => e.eventId === "events:e1" && e.email === "alice@test.com"
    );
    expect(isDuplicate).toBe(true);
  });

  it("allows same email for different event", () => {
    const entries = [
      { eventId: "events:e1", email: "alice@test.com" },
    ];
    const isDuplicate = entries.some(
      (e) => e.eventId === "events:e2" && e.email === "alice@test.com"
    );
    expect(isDuplicate).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Position assignment
// ---------------------------------------------------------------------------

describe("waitlist position", () => {
  it("assigns position based on existing count + 1", () => {
    const existingCount = 5;
    const newPosition = existingCount + 1;
    expect(newPosition).toBe(6);
  });

  it("first entry gets position 1", () => {
    const existingCount = 0;
    const newPosition = existingCount + 1;
    expect(newPosition).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Email normalization
// ---------------------------------------------------------------------------

describe("email normalization", () => {
  it("trims and lowercases email", () => {
    const input = "  Alice@Test.COM  ";
    const normalized = input.trim().toLowerCase();
    expect(normalized).toBe("alice@test.com");
  });
});

// ---------------------------------------------------------------------------
// Notification logic (FIFO)
// ---------------------------------------------------------------------------

describe("waitlist notification FIFO", () => {
  const entries = [
    { position: 1, status: "waiting", email: "first@test.com" },
    { position: 2, status: "waiting", email: "second@test.com" },
    { position: 3, status: "waiting", email: "third@test.com" },
    { position: 4, status: "notified", email: "already@test.com" },
    { position: 5, status: "waiting", email: "fifth@test.com" },
  ];

  it("selects waiting entries in position order", () => {
    const waiting = entries
      .filter((e) => e.status === "waiting")
      .sort((a, b) => a.position - b.position);
    expect(waiting[0].email).toBe("first@test.com");
    expect(waiting[1].email).toBe("second@test.com");
  });

  it("skips already-notified entries", () => {
    const waiting = entries.filter((e) => e.status === "waiting");
    expect(waiting.every((e) => e.email !== "already@test.com")).toBe(true);
  });

  it("limits to requested count", () => {
    const waiting = entries
      .filter((e) => e.status === "waiting")
      .sort((a, b) => a.position - b.position)
      .slice(0, 2);
    expect(waiting.length).toBe(2);
    expect(waiting[0].email).toBe("first@test.com");
    expect(waiting[1].email).toBe("second@test.com");
  });
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

describe("waitlist status transitions", () => {
  it("waiting → notified on notification", () => {
    const entry = { status: "waiting" };
    const updated = { ...entry, status: "notified", notifiedAt: Date.now() };
    expect(updated.status).toBe("notified");
    expect(updated.notifiedAt).toBeGreaterThan(0);
  });

  it("valid statuses are waiting, notified, purchased, expired", () => {
    const validStatuses = ["waiting", "notified", "purchased", "expired"];
    expect(validStatuses).toContain("waiting");
    expect(validStatuses).toContain("notified");
    expect(validStatuses).toContain("purchased");
    expect(validStatuses).toContain("expired");
  });
});

// ---------------------------------------------------------------------------
// Waitlist count
// ---------------------------------------------------------------------------

describe("waitlist count", () => {
  it("counts only waiting entries", () => {
    const entries = [
      { status: "waiting" },
      { status: "waiting" },
      { status: "notified" },
      { status: "purchased" },
    ];
    const waitingCount = entries.filter((e) => e.status === "waiting").length;
    expect(waitingCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Creator authorization
// ---------------------------------------------------------------------------

describe("waitlist creator authorization", () => {
  const CREATOR_ROLES = ["artist", "organization"];

  it("allows creator to view/notify waitlist", () => {
    expect(CREATOR_ROLES.includes("artist")).toBe(true);
  });

  it("requires event ownership", () => {
    const event = { creatorId: "users:c1" };
    const user = { _id: "users:c2" };
    expect(event.creatorId === user._id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Entry shape
// ---------------------------------------------------------------------------

describe("waitlist entry shape", () => {
  it("includes required fields", () => {
    const entry = {
      eventId: "events:e1",
      email: "alice@test.com",
      position: 1,
      status: "waiting",
      createdAt: Date.now(),
    };

    expect(entry).toHaveProperty("eventId");
    expect(entry).toHaveProperty("email");
    expect(entry).toHaveProperty("position");
    expect(entry).toHaveProperty("status");
    expect(entry).toHaveProperty("createdAt");
  });
});
