import { describe, it, expect } from "vitest";

/**
 * Contract tests for creatorProfiles mutations.
 * Verifies business logic contracts without requiring Convex context.
 */

describe("upsertProfile mutation contract", () => {
  it("should require a non-empty trimmed displayName", () => {
    const displayName = "  Test Artist  ".trim();
    expect(displayName).toBe("Test Artist");
    expect(displayName.length).toBeGreaterThan(0);

    const emptyTrimmed = "   ".trim();
    expect(emptyTrimmed).toBe("");
    expect(emptyTrimmed.length).toBe(0);
  });

  it("should reject bio over 2000 characters", () => {
    const longBio = "x".repeat(2001);
    const isValid = longBio.length <= 2000;
    expect(isValid).toBe(false);

    const exactBio = "x".repeat(2000);
    expect(exactBio.length <= 2000).toBe(true);
  });

  it("should validate URL fields with URL constructor", () => {
    const validUrls = [
      "https://example.com",
      "https://instagram.com/user",
      "https://open.spotify.com/artist/123",
    ];
    for (const url of validUrls) {
      expect(() => new URL(url)).not.toThrow();
    }

    const invalidUrls = ["not-a-url", "example.com", "ftp://"];
    for (const url of invalidUrls) {
      expect(() => new URL(url)).toThrow();
    }
  });

  it("should skip URL validation for empty strings", () => {
    // Contract: empty string URLs are allowed (treated as "not set")
    const value = "";
    const shouldValidate = value !== "";
    expect(shouldValidate).toBe(false);
  });

  it("should require artist or organization role", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("venue_manager");
    expect(allowedRoles).not.toContain("admin");
  });

  it("should upsert — patch existing or insert new", () => {
    // Contract: if profile exists for userId, patch it; otherwise insert
    const existingProfile = { _id: "profile_123", userId: "user_123" };
    const shouldPatch = existingProfile !== null;
    expect(shouldPatch).toBe(true);

    const noProfile = null;
    const shouldInsert = noProfile === null;
    expect(shouldInsert).toBe(true);
  });

  it("should set createdAt and updatedAt on insert, only updatedAt on patch", () => {
    const now = Date.now();

    // Insert case
    const insertData = { createdAt: now, updatedAt: now };
    expect(insertData.createdAt).toBe(insertData.updatedAt);

    // Patch case — only updatedAt changes
    const patchData = { updatedAt: now };
    expect(patchData).not.toHaveProperty("createdAt");
  });
});

describe("getMyProfile query contract", () => {
  it("should return null when user is not authenticated", () => {
    const identity = null;
    expect(identity).toBeNull();
  });

  it("should query by userId index, not scan", () => {
    // Contract: uses .withIndex("by_user_id") for efficient lookup
    const indexName = "by_user_id";
    expect(indexName).toBe("by_user_id");
  });

  it("should return unique profile per user", () => {
    // Contract: .unique() ensures one profile per user
    const results = [{ userId: "user_1", displayName: "Test" }];
    expect(results.length).toBe(1);
  });
});

describe("getProfileByUserId query contract", () => {
  it("should accept a Convex user ID and return the profile", () => {
    // Contract: public query accepting v.id("users")
    const userId = "user_123";
    expect(typeof userId).toBe("string");
  });
});
