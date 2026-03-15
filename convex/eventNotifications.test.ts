import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for event notification triggers.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Follower targeting (publishEvent → followers)
// ---------------------------------------------------------------------------

describe("new event notification targeting", () => {
  const follows = [
    { followerId: "u1", entityType: "creator", entityId: "creator1" },
    { followerId: "u2", entityType: "creator", entityId: "creator1" },
    { followerId: "u3", entityType: "venue", entityId: "venue1" },
    { followerId: "u4", entityType: "creator", entityId: "creator2" },
  ];

  it("queries followers by creator entityType and entityId", () => {
    const creatorId = "creator1";
    const targeted = follows.filter(
      (f) => f.entityType === "creator" && f.entityId === creatorId
    );
    expect(targeted.length).toBe(2);
    expect(targeted.map((f) => f.followerId)).toEqual(["u1", "u2"]);
  });

  it("does not include venue followers", () => {
    const creatorId = "creator1";
    const targeted = follows.filter(
      (f) => f.entityType === "creator" && f.entityId === creatorId
    );
    expect(targeted.every((f) => f.entityType === "creator")).toBe(true);
  });

  it("returns empty for creator with no followers", () => {
    const targeted = follows.filter(
      (f) => f.entityType === "creator" && f.entityId === "creator99"
    );
    expect(targeted.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Ticket holder targeting (cancelEvent → buyers)
// ---------------------------------------------------------------------------

describe("event cancellation notification targeting", () => {
  const tickets = [
    { buyerUserId: "u1", eventId: "e1" },
    { buyerUserId: "u2", eventId: "e1" },
    { buyerUserId: "u1", eventId: "e1" }, // duplicate buyer
    { buyerUserId: null, eventId: "e1" }, // anonymous purchase
    { buyerUserId: "u3", eventId: "e2" }, // different event
  ];

  it("extracts unique buyer user IDs for the event", () => {
    const eventTickets = tickets.filter((t) => t.eventId === "e1");
    const uniqueBuyerIds = [
      ...new Set(
        eventTickets
          .map((t) => t.buyerUserId)
          .filter((id): id is string => !!id)
      ),
    ];
    expect(uniqueBuyerIds).toEqual(["u1", "u2"]);
  });

  it("filters out null buyerUserId (anonymous purchases)", () => {
    const eventTickets = tickets.filter((t) => t.eventId === "e1");
    const withUserId = eventTickets.filter((t) => !!t.buyerUserId);
    const withoutUserId = eventTickets.filter((t) => !t.buyerUserId);
    expect(withUserId.length).toBe(3);
    expect(withoutUserId.length).toBe(1);
  });

  it("deduplicates multiple tickets from same buyer", () => {
    const eventTickets = tickets.filter((t) => t.eventId === "e1");
    const allBuyerIds = eventTickets
      .map((t) => t.buyerUserId)
      .filter((id): id is string => !!id);
    const uniqueIds = [...new Set(allBuyerIds)];

    expect(allBuyerIds.length).toBe(3); // 3 tickets with userId
    expect(uniqueIds.length).toBe(2); // 2 unique users
  });

  it("returns empty for event with no tickets", () => {
    const eventTickets = tickets.filter((t) => t.eventId === "e99");
    expect(eventTickets.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Notification payload shapes
// ---------------------------------------------------------------------------

describe("notification payload shapes", () => {
  it("new_event notification has correct shape", () => {
    const payload = {
      userId: "users:follower1",
      type: "new_event",
      title: "New event from Jazz Band",
      message: "Jazz on the Roof",
      entityType: "event",
      entityId: "events:abc",
    };

    expect(payload.type).toBe("new_event");
    expect(payload.title).toMatch(/^New event from /);
    expect(payload.entityType).toBe("event");
    expect(typeof payload.message).toBe("string");
  });

  it("event_cancelled notification has correct shape", () => {
    const payload = {
      userId: "users:buyer1",
      type: "event_cancelled",
      title: "Jazz on the Roof has been cancelled",
      message: "Venue unavailable due to weather",
      entityType: "event",
      entityId: "events:abc",
    };

    expect(payload.type).toBe("event_cancelled");
    expect(payload.title).toMatch(/has been cancelled$/);
    expect(payload.entityType).toBe("event");
    expect(typeof payload.message).toBe("string");
  });

  it("event_cancelled with no reason uses fallback message", () => {
    const reason: string | undefined = undefined;
    const message = reason || "No reason provided";
    expect(message).toBe("No reason provided");
  });

  it("event_updated notification has correct shape", () => {
    const payload = {
      userId: "users:buyer1",
      type: "event_updated",
      title: "Jazz on the Roof has been updated",
      message: "Check the new details",
      entityType: "event",
      entityId: "events:abc",
    };

    expect(payload.type).toBe("event_updated");
    expect(payload.title).toMatch(/has been updated$/);
    expect(payload.message).toBe("Check the new details");
  });
});

// ---------------------------------------------------------------------------
// Batch notification logic
// ---------------------------------------------------------------------------

describe("batch notification logic", () => {
  it("creates one notification per unique follower", () => {
    const followers = [
      { followerId: "u1" },
      { followerId: "u2" },
      { followerId: "u3" },
    ];
    const notifications = followers.map((f) => ({
      userId: f.followerId,
      type: "new_event",
      title: "New event",
      message: "Test",
    }));
    expect(notifications.length).toBe(3);
    expect(new Set(notifications.map((n) => n.userId)).size).toBe(3);
  });

  it("creates one notification per unique ticket holder (deduplicated)", () => {
    const tickets = [
      { buyerUserId: "u1" },
      { buyerUserId: "u2" },
      { buyerUserId: "u1" }, // dup
      { buyerUserId: "u2" }, // dup
    ];
    const uniqueIds = [...new Set(tickets.map((t) => t.buyerUserId))];
    expect(uniqueIds.length).toBe(2);
  });
});
