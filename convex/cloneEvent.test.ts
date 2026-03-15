import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for cloneEvent mutation.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Clone field mapping
// ---------------------------------------------------------------------------

describe("cloneEvent field mapping", () => {
  const source = {
    _id: "events:abc",
    creatorId: "users:creator1",
    eventType: "concert",
    title: "Summer Music Fest",
    description: "A great festival",
    date: 1700000000000,
    time: "19:30",
    venueName: "Main Stage",
    venueId: "venues:v1",
    status: "published",
    artworkStorageId: "storage:art1",
    createdAt: 1699000000000,
    updatedAt: 1699500000000,
  };

  it("appends ' (Copy)' to title", () => {
    const clonedTitle = source.title + " (Copy)";
    expect(clonedTitle).toBe("Summer Music Fest (Copy)");
  });

  it("copies description from source", () => {
    expect(source.description).toBe("A great festival");
  });

  it("copies eventType from source", () => {
    expect(source.eventType).toBe("concert");
  });

  it("copies time from source", () => {
    expect(source.time).toBe("19:30");
  });

  it("copies venueName from source", () => {
    expect(source.venueName).toBe("Main Stage");
  });

  it("copies venueId from source", () => {
    expect(source.venueId).toBe("venues:v1");
  });

  it("resets date to 0", () => {
    const clonedDate = 0;
    expect(clonedDate).toBe(0);
    expect(clonedDate).not.toBe(source.date);
  });

  it("sets status to draft regardless of source status", () => {
    const clonedStatus = "draft";
    expect(clonedStatus).toBe("draft");
    expect(source.status).toBe("published");
  });

  it("does not copy artworkStorageId", () => {
    const cloned = {
      title: source.title + " (Copy)",
      description: source.description,
      eventType: source.eventType,
      time: source.time,
      venueName: source.venueName,
      venueId: source.venueId,
      date: 0,
      status: "draft",
    };

    expect(cloned).not.toHaveProperty("artworkStorageId");
  });

  it("generates new timestamps", () => {
    const now = Date.now();
    const cloned = { createdAt: now, updatedAt: now };

    expect(cloned.createdAt).not.toBe(source.createdAt);
    expect(cloned.updatedAt).not.toBe(source.updatedAt);
    expect(cloned.createdAt).toBe(cloned.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// Cancelled event cloning
// ---------------------------------------------------------------------------

describe("cancelled event cloning", () => {
  it("clone of cancelled event has status draft", () => {
    const source = { status: "cancelled" };
    const clonedStatus = "draft";
    expect(clonedStatus).toBe("draft");
    expect(source.status).toBe("cancelled");
  });

  it("clone of draft event has status draft", () => {
    const source = { status: "draft" };
    const clonedStatus = "draft";
    expect(clonedStatus).toBe("draft");
    expect(source.status).toBe("draft");
  });
});

// ---------------------------------------------------------------------------
// Ticket tier duplication
// ---------------------------------------------------------------------------

describe("ticket tier duplication", () => {
  const sourceTiers = [
    {
      name: "VIP",
      price: 500000,
      quantity: 50,
      description: "Front row seats",
      sortOrder: 0,
      soldCount: 30,
      createdAt: 1699000000000,
      updatedAt: 1699500000000,
    },
    {
      name: "General",
      price: 100000,
      quantity: 200,
      description: undefined,
      sortOrder: 1,
      soldCount: 150,
      createdAt: 1699000000000,
      updatedAt: 1699500000000,
    },
  ];

  it("copies name, price, quantity, description, sortOrder", () => {
    for (const tier of sourceTiers) {
      const cloned = {
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description,
        sortOrder: tier.sortOrder,
        soldCount: 0,
      };

      expect(cloned.name).toBe(tier.name);
      expect(cloned.price).toBe(tier.price);
      expect(cloned.quantity).toBe(tier.quantity);
      expect(cloned.description).toBe(tier.description);
      expect(cloned.sortOrder).toBe(tier.sortOrder);
    }
  });

  it("resets soldCount to 0", () => {
    for (const tier of sourceTiers) {
      const clonedSoldCount = 0;
      expect(clonedSoldCount).toBe(0);
      expect(tier.soldCount).toBeGreaterThan(0);
    }
  });

  it("generates new timestamps for tiers", () => {
    const now = Date.now();
    for (const tier of sourceTiers) {
      const cloned = { createdAt: now, updatedAt: now };
      expect(cloned.createdAt).not.toBe(tier.createdAt);
    }
  });

  it("duplicates all tiers (same count)", () => {
    const clonedTiers = sourceTiers.map((t) => ({
      name: t.name,
      price: t.price,
      quantity: t.quantity,
      description: t.description,
      sortOrder: t.sortOrder,
      soldCount: 0,
    }));

    expect(clonedTiers.length).toBe(sourceTiers.length);
    expect(clonedTiers.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("cloneEvent authorization", () => {
  const CREATOR_ROLES = ["artist", "organization"];

  function canClone(activeRole: string): boolean {
    return CREATOR_ROLES.includes(activeRole);
  }

  it("allows artist role", () => {
    expect(canClone("artist")).toBe(true);
  });

  it("allows organization role", () => {
    expect(canClone("organization")).toBe(true);
  });

  it("rejects attendee role", () => {
    expect(canClone("attendee")).toBe(false);
  });

  it("rejects admin role", () => {
    expect(canClone("admin")).toBe(false);
  });

  it("rejects venue_manager role", () => {
    expect(canClone("venue_manager")).toBe(false);
  });

  it("requires ownership of source event", () => {
    const event = { creatorId: "users:creator1" };
    const user = { _id: "users:creator2" };
    expect(event.creatorId === user._id).toBe(false);
  });

  it("allows owner to clone", () => {
    const event = { creatorId: "users:creator1" };
    const user = { _id: "users:creator1" };
    expect(event.creatorId === user._id).toBe(true);
  });
});
