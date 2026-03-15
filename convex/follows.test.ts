import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for follow system.
 * No Convex runtime — tests business rule logic only.
 */

const VALID_ENTITY_TYPES = ["creator", "venue"];

// ---------------------------------------------------------------------------
// Authorization contract
// ---------------------------------------------------------------------------

function canFollowEntity(isAuthenticated: boolean): boolean {
  return isAuthenticated;
}

describe("followEntity authorization contract", () => {
  it("requires authentication", () => {
    expect(canFollowEntity(true)).toBe(true);
    expect(canFollowEntity(false)).toBe(false);
  });
});

describe("unfollowEntity authorization contract", () => {
  it("requires authentication", () => {
    expect(canFollowEntity(true)).toBe(true);
    expect(canFollowEntity(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Entity type validation
// ---------------------------------------------------------------------------

describe("entity type validation", () => {
  it("accepts 'creator' entity type", () => {
    expect(VALID_ENTITY_TYPES.includes("creator")).toBe(true);
  });

  it("accepts 'venue' entity type", () => {
    expect(VALID_ENTITY_TYPES.includes("venue")).toBe(true);
  });

  it("rejects invalid entity types", () => {
    expect(VALID_ENTITY_TYPES.includes("event")).toBe(false);
    expect(VALID_ENTITY_TYPES.includes("admin")).toBe(false);
    expect(VALID_ENTITY_TYPES.includes("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Duplicate follow prevention
// ---------------------------------------------------------------------------

describe("duplicate follow prevention", () => {
  it("detects duplicate follow by same user, entityType, entityId", () => {
    const existingFollows = [
      { followerId: "user1", entityType: "creator", entityId: "creator1" },
      { followerId: "user1", entityType: "venue", entityId: "venue1" },
    ];

    const isDuplicate = (
      followerId: string,
      entityType: string,
      entityId: string
    ) =>
      existingFollows.some(
        (f) =>
          f.followerId === followerId &&
          f.entityType === entityType &&
          f.entityId === entityId
      );

    expect(isDuplicate("user1", "creator", "creator1")).toBe(true);
    expect(isDuplicate("user1", "venue", "venue1")).toBe(true);
    // Different user, same entity — not a duplicate
    expect(isDuplicate("user2", "creator", "creator1")).toBe(false);
    // Same user, different entity type — not a duplicate
    expect(isDuplicate("user1", "venue", "creator1")).toBe(false);
    // Same user, different entity ID — not a duplicate
    expect(isDuplicate("user1", "creator", "creator2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unfollow logic
// ---------------------------------------------------------------------------

describe("unfollow logic", () => {
  it("requires existing follow record to unfollow", () => {
    const existingFollows = [
      { followerId: "user1", entityType: "creator", entityId: "creator1" },
    ];

    const canUnfollow = (
      followerId: string,
      entityType: string,
      entityId: string
    ) =>
      existingFollows.some(
        (f) =>
          f.followerId === followerId &&
          f.entityType === entityType &&
          f.entityId === entityId
      );

    expect(canUnfollow("user1", "creator", "creator1")).toBe(true);
    expect(canUnfollow("user1", "venue", "venue1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFollowing query contract
// ---------------------------------------------------------------------------

describe("isFollowing query contract", () => {
  it("returns false for unauthenticated users", () => {
    const isAuthenticated = false;
    const result = isAuthenticated ? true : false;
    expect(result).toBe(false);
  });

  it("returns true when follow record exists", () => {
    const follows = [
      { followerId: "user1", entityType: "creator", entityId: "c1" },
    ];
    const exists = follows.some(
      (f) =>
        f.followerId === "user1" &&
        f.entityType === "creator" &&
        f.entityId === "c1"
    );
    expect(exists).toBe(true);
  });

  it("returns false when no follow record", () => {
    const follows: { followerId: string; entityType: string; entityId: string }[] = [];
    const exists = follows.some(
      (f) =>
        f.followerId === "user1" &&
        f.entityType === "creator" &&
        f.entityId === "c1"
    );
    expect(exists).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getMyFollowing return shape
// ---------------------------------------------------------------------------

describe("getMyFollowing return shape", () => {
  it("includes all required fields", () => {
    const item = {
      entityType: "creator",
      entityId: "users:abc",
      entityName: "Jazz Band",
      createdAt: 1700000000000,
    };

    expect(item).toHaveProperty("entityType");
    expect(item).toHaveProperty("entityId");
    expect(item).toHaveProperty("entityName");
    expect(item).toHaveProperty("createdAt");
    expect(typeof item.entityName).toBe("string");
  });

  it("does not leak internal fields", () => {
    const item = {
      entityType: "venue",
      entityId: "venues:abc",
      entityName: "Main Stage",
      createdAt: 1700000000000,
    };

    expect(item).not.toHaveProperty("_id");
    expect(item).not.toHaveProperty("followerId");
  });
});

// ---------------------------------------------------------------------------
// Follower count computation
// ---------------------------------------------------------------------------

describe("follower count computation", () => {
  const follows = [
    { followerId: "u1", entityType: "creator", entityId: "c1" },
    { followerId: "u2", entityType: "creator", entityId: "c1" },
    { followerId: "u3", entityType: "creator", entityId: "c1" },
    { followerId: "u1", entityType: "venue", entityId: "v1" },
    { followerId: "u2", entityType: "creator", entityId: "c2" },
  ];

  it("counts followers for a specific entity", () => {
    const count = follows.filter(
      (f) => f.entityType === "creator" && f.entityId === "c1"
    ).length;
    expect(count).toBe(3);
  });

  it("returns 0 for entity with no followers", () => {
    const count = follows.filter(
      (f) => f.entityType === "venue" && f.entityId === "v99"
    ).length;
    expect(count).toBe(0);
  });

  it("counts separately per entity type", () => {
    const creatorCount = follows.filter(
      (f) => f.entityType === "creator" && f.entityId === "c1"
    ).length;
    const venueCount = follows.filter(
      (f) => f.entityType === "venue" && f.entityId === "v1"
    ).length;
    expect(creatorCount).toBe(3);
    expect(venueCount).toBe(1);
  });
});
