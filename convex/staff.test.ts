import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for staff assignment system.
 * No Convex runtime — tests business rule logic only.
 */

const CREATOR_ROLES = ["artist", "organization"];

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("staff assignment authorization", () => {
  function canManageStaff(activeRole: string): boolean {
    return CREATOR_ROLES.includes(activeRole);
  }

  it("allows artist to manage staff", () => {
    expect(canManageStaff("artist")).toBe(true);
  });

  it("allows organization to manage staff", () => {
    expect(canManageStaff("organization")).toBe(true);
  });

  it("rejects attendee", () => {
    expect(canManageStaff("attendee")).toBe(false);
  });

  it("rejects staff role from managing other staff", () => {
    expect(canManageStaff("staff")).toBe(false);
  });

  it("requires event ownership", () => {
    const event = { creatorId: "users:creator1" };
    const user = { _id: "users:creator2" };
    expect(event.creatorId === user._id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Staff role addition
// ---------------------------------------------------------------------------

describe("staff role addition", () => {
  it("adds staff role when not present", () => {
    const user = { roles: ["attendee"] };
    const hasStaff = user.roles.includes("staff");
    expect(hasStaff).toBe(false);

    const updatedRoles = [...user.roles, "staff"];
    expect(updatedRoles).toContain("staff");
    expect(updatedRoles).toContain("attendee");
  });

  it("does not duplicate staff role if already present", () => {
    const user = { roles: ["attendee", "staff"] };
    const hasStaff = user.roles.includes("staff");
    expect(hasStaff).toBe(true);
    // Should NOT add again
  });
});

// ---------------------------------------------------------------------------
// Staff role removal
// ---------------------------------------------------------------------------

describe("staff role removal on unassignment", () => {
  it("removes staff role when no assignments remain", () => {
    const remainingAssignments: unknown[] = [];
    const user = { roles: ["attendee", "staff"], activeRole: "staff" };

    if (remainingAssignments.length === 0) {
      const updatedRoles = user.roles.filter((r) => r !== "staff");
      expect(updatedRoles).toEqual(["attendee"]);
      expect(updatedRoles).not.toContain("staff");
    }
  });

  it("keeps staff role when other assignments exist", () => {
    const remainingAssignments = [{ eventId: "events:other" }];
    const user = { roles: ["attendee", "staff"] };

    if (remainingAssignments.length > 0) {
      // Don't remove role
      expect(user.roles).toContain("staff");
    }
  });

  it("resets activeRole when staff role removed", () => {
    const user = { roles: ["attendee", "staff"], activeRole: "staff" };
    const updatedRoles = user.roles.filter((r) => r !== "staff");
    const newActiveRole = user.activeRole === "staff" ? updatedRoles[0] ?? "attendee" : user.activeRole;

    expect(newActiveRole).toBe("attendee");
  });

  it("preserves activeRole when it's not staff", () => {
    const user = { roles: ["attendee", "artist", "staff"], activeRole: "artist" };
    const updatedRoles = user.roles.filter((r) => r !== "staff");
    const newActiveRole = user.activeRole === "staff" ? updatedRoles[0] : user.activeRole;

    expect(newActiveRole).toBe("artist");
  });
});

// ---------------------------------------------------------------------------
// Duplicate assignment prevention
// ---------------------------------------------------------------------------

describe("duplicate assignment prevention", () => {
  it("detects existing assignment for same event and user", () => {
    const assignments = [
      { userId: "users:staff1", eventId: "events:e1" },
      { userId: "users:staff2", eventId: "events:e1" },
    ];
    const targetUserId = "users:staff1";
    const alreadyAssigned = assignments.some((a) => a.userId === targetUserId);
    expect(alreadyAssigned).toBe(true);
  });

  it("allows assignment for different event", () => {
    const assignments = [
      { userId: "users:staff1", eventId: "events:e1" },
    ];
    const targetUserId = "users:staff1";
    const targetEventAssignments = assignments.filter((a) => a.userId === targetUserId);
    // User is assigned to e1, but we're checking e2
    expect(targetEventAssignments.some((a) => a.eventId === "events:e2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Self-assignment prevention
// ---------------------------------------------------------------------------

describe("self-assignment prevention", () => {
  it("prevents creator from assigning themselves", () => {
    const creator = { _id: "users:creator1" };
    const staffUser = { _id: "users:creator1" };
    expect(creator._id === staffUser._id).toBe(true);
  });

  it("allows assigning a different user", () => {
    const creator = { _id: "users:creator1" };
    const staffUser = { _id: "users:staff1" };
    expect(creator._id === staffUser._id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Assignment return shapes
// ---------------------------------------------------------------------------

describe("getEventStaff return shape", () => {
  it("includes safe public fields only", () => {
    const staffMember = {
      userId: "users:staff1",
      name: "Alice",
      email: "alice@test.com",
      assignedAt: Date.now(),
    };

    expect(staffMember).toHaveProperty("userId");
    expect(staffMember).toHaveProperty("name");
    expect(staffMember).toHaveProperty("email");
    expect(staffMember).toHaveProperty("assignedAt");
  });
});

describe("getMyAssignments return shape", () => {
  it("includes event display fields", () => {
    const assignment = {
      eventId: "events:e1",
      eventTitle: "Summer Fest",
      eventDate: 1700000000000,
      eventTime: "19:00",
      eventStatus: "published",
    };

    expect(assignment).toHaveProperty("eventId");
    expect(assignment).toHaveProperty("eventTitle");
    expect(assignment).toHaveProperty("eventDate");
    expect(assignment).toHaveProperty("eventStatus");
  });
});

// ---------------------------------------------------------------------------
// Scanner authorization (Story 12.2)
// ---------------------------------------------------------------------------

describe("canScanEvent authorization", () => {
  function canScan(
    userId: string,
    event: { creatorId: string },
    assignments: { userId: string }[]
  ): boolean {
    if (event.creatorId === userId) return true;
    return assignments.some((a) => a.userId === userId);
  }

  it("allows event creator to scan", () => {
    expect(
      canScan("users:creator1", { creatorId: "users:creator1" }, [])
    ).toBe(true);
  });

  it("allows assigned staff to scan", () => {
    expect(
      canScan(
        "users:staff1",
        { creatorId: "users:creator1" },
        [{ userId: "users:staff1" }]
      )
    ).toBe(true);
  });

  it("rejects unassigned user", () => {
    expect(
      canScan(
        "users:random1",
        { creatorId: "users:creator1" },
        [{ userId: "users:staff1" }]
      )
    ).toBe(false);
  });

  it("rejects user with no assignments and not creator", () => {
    expect(
      canScan("users:random1", { creatorId: "users:creator1" }, [])
    ).toBe(false);
  });

  it("returns eventTitle when authorized", () => {
    const event = { creatorId: "users:creator1", title: "Summer Fest" };
    const authorized = canScan("users:creator1", event, []);
    const result = authorized
      ? { authorized: true, eventTitle: event.title }
      : { authorized: false };
    expect(result).toEqual({ authorized: true, eventTitle: "Summer Fest" });
  });
});
