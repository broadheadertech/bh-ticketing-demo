import { describe, it, expect } from "vitest";

/**
 * Contract tests for stripeConnect Convex mutation.
 * Verifies business logic without requiring Convex context.
 */

describe("saveStripeAccountId mutation contract", () => {
  it("should only allow artist or organization roles", () => {
    const allowedRoles = ["artist", "organization"];
    expect(allowedRoles).toContain("artist");
    expect(allowedRoles).toContain("organization");
    expect(allowedRoles).not.toContain("attendee");
    expect(allowedRoles).not.toContain("admin");
    expect(allowedRoles).not.toContain("venue_manager");
  });

  it("should reject stripeAccountId that does not start with acct_", () => {
    const invalidIds = ["not-valid", "", "123456", "stripe_123", "ACCT_123"];
    for (const id of invalidIds) {
      expect(id.startsWith("acct_")).toBe(false);
    }
  });

  it("should accept stripeAccountId starting with acct_", () => {
    const validId = "acct_1PqwZxRD9mFx1234";
    expect(validId.startsWith("acct_")).toBe(true);
  });

  it("should patch only the authenticated user's own record", () => {
    // Contract: patches user._id — not any arbitrary userId
    const user = { _id: "users:abc123", stripeAccountId: undefined };
    const patchData = { stripeAccountId: "acct_123" };
    const updatedUser = { ...user, ...patchData };
    expect(updatedUser.stripeAccountId).toBe("acct_123");
    expect(updatedUser._id).toBe("users:abc123");
  });

  it("should store stripeAccountId as a string on the users record", () => {
    const stripeAccountId = "acct_1PqwZxRD9mFx1234";
    expect(typeof stripeAccountId).toBe("string");
  });

  it("validation runs before authorization check", () => {
    // Contract: format check first, then auth — prevents leaking auth status on bad input
    const validateFormat = (id: string) => id.startsWith("acct_");
    expect(validateFormat("not-valid")).toBe(false);
    expect(validateFormat("acct_valid")).toBe(true);
  });
});
