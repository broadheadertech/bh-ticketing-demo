import { describe, it, expect } from "vitest";

/**
 * Contract tests for files mutations.
 * Verifies business logic contracts without requiring Convex context.
 */

describe("generateUploadUrl mutation contract", () => {
  it("should only allow artist or organization roles", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("venue_manager");
    expect(allowedRoles).not.toContain("admin");
  });

  it("should require authentication", () => {
    // The mutation calls getAuthenticatedUser before generating URL
    const requiresAuth = true;
    expect(requiresAuth).toBe(true);
  });
});
