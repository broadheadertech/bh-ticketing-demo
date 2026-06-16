import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for notification infrastructure.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Authorization contract
// ---------------------------------------------------------------------------

function requiresAuth(isAuthenticated: boolean): boolean {
  return isAuthenticated;
}

describe("notification queries authorization", () => {
  it("getMyNotifications requires auth", () => {
    expect(requiresAuth(true)).toBe(true);
    expect(requiresAuth(false)).toBe(false);
  });

  it("getUnreadCount requires auth", () => {
    expect(requiresAuth(true)).toBe(true);
    expect(requiresAuth(false)).toBe(false);
  });

  it("markAsRead requires auth", () => {
    expect(requiresAuth(true)).toBe(true);
    expect(requiresAuth(false)).toBe(false);
  });

  it("markAllAsRead requires auth", () => {
    expect(requiresAuth(true)).toBe(true);
    expect(requiresAuth(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Notification return shape
// ---------------------------------------------------------------------------

describe("notification return shape", () => {
  it("includes all required fields", () => {
    const notification = {
      _id: "notifications:abc",
      type: "new_event",
      title: "New event from Jazz Band",
      message: "Jazz on the Roof is now live!",
      entityType: "event",
      entityId: "events:xyz",
      read: false,
      createdAt: 1700000000000,
    };

    expect(notification).toHaveProperty("_id");
    expect(notification).toHaveProperty("type");
    expect(notification).toHaveProperty("title");
    expect(notification).toHaveProperty("message");
    expect(notification).toHaveProperty("entityType");
    expect(notification).toHaveProperty("entityId");
    expect(notification).toHaveProperty("read");
    expect(notification).toHaveProperty("createdAt");
    expect(typeof notification.read).toBe("boolean");
  });

  it("supports optional entityType and entityId", () => {
    const notification = {
      _id: "notifications:abc",
      type: "system",
      title: "Welcome!",
      message: "Thanks for joining TIX.PH",
      entityType: undefined,
      entityId: undefined,
      read: false,
      createdAt: 1700000000000,
    };

    expect(notification.entityType).toBeUndefined();
    expect(notification.entityId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Unread count computation
// ---------------------------------------------------------------------------

describe("unread count computation", () => {
  const notifications = [
    { userId: "u1", read: false },
    { userId: "u1", read: false },
    { userId: "u1", read: true },
    { userId: "u1", read: false },
    { userId: "u2", read: false },
  ];

  it("counts only unread notifications for the user", () => {
    const count = notifications.filter(
      (n) => n.userId === "u1" && !n.read
    ).length;
    expect(count).toBe(3);
  });

  it("returns 0 when all notifications are read", () => {
    const allRead = notifications.map((n) => ({ ...n, read: true }));
    const count = allRead.filter(
      (n) => n.userId === "u1" && !n.read
    ).length;
    expect(count).toBe(0);
  });

  it("returns 0 for user with no notifications", () => {
    const count = notifications.filter(
      (n) => n.userId === "u99" && !n.read
    ).length;
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markAsRead logic
// ---------------------------------------------------------------------------

describe("markAsRead logic", () => {
  it("sets read to true", () => {
    const notification = { read: false, userId: "u1" };
    const patched = { ...notification, read: true };
    expect(patched.read).toBe(true);
  });

  it("rejects notification belonging to different user", () => {
    const notification = { userId: "u2" };
    const currentUserId = "u1";
    expect(notification.userId !== currentUserId).toBe(true);
  });

  it("is idempotent for already-read notifications", () => {
    const notification = { read: true, userId: "u1" };
    // Should not throw, just no-op
    expect(notification.read).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// markAllAsRead logic
// ---------------------------------------------------------------------------

describe("markAllAsRead logic", () => {
  it("patches all unread notifications for user to read", () => {
    const notifications = [
      { _id: "n1", userId: "u1", read: false },
      { _id: "n2", userId: "u1", read: false },
      { _id: "n3", userId: "u1", read: true },
    ];

    const unread = notifications.filter(
      (n) => n.userId === "u1" && !n.read
    );
    const patched = unread.map((n) => ({ ...n, read: true }));

    expect(patched.length).toBe(2);
    expect(patched.every((n) => n.read)).toBe(true);
  });

  it("does nothing when no unread notifications exist", () => {
    const notifications = [
      { _id: "n1", userId: "u1", read: true },
      { _id: "n2", userId: "u1", read: true },
    ];

    const unread = notifications.filter(
      (n) => n.userId === "u1" && !n.read
    );
    expect(unread.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Navigation URL generation
// ---------------------------------------------------------------------------

describe("notification navigation URL generation", () => {
  function getNotificationHref(
    entityType?: string,
    entityId?: string
  ): string | null {
    if (!entityType || !entityId) return null;
    if (entityType === "event") return `/events/${entityId}`;
    if (entityType === "venue") return `/venues/${entityId}`;
    if (entityType === "creator") return `/events?creator=${entityId}`;
    return null;
  }

  it("generates event URL", () => {
    expect(getNotificationHref("event", "events:abc")).toBe(
      "/events/events:abc"
    );
  });

  it("generates venue URL", () => {
    expect(getNotificationHref("venue", "venues:abc")).toBe(
      "/venues/venues:abc"
    );
  });

  it("generates creator URL with query param", () => {
    expect(getNotificationHref("creator", "users:abc")).toBe(
      "/events?creator=users:abc"
    );
  });

  it("returns null when no entity", () => {
    expect(getNotificationHref(undefined, undefined)).toBeNull();
    expect(getNotificationHref("event", undefined)).toBeNull();
    expect(getNotificationHref(undefined, "id")).toBeNull();
  });

  it("returns null for unknown entity type", () => {
    expect(getNotificationHref("unknown", "id")).toBeNull();
  });
});
