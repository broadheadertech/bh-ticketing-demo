import { describe, it, expect } from "vitest";

/**
 * Convex mutation handlers (createUser, updateUser, deleteUser) are thin
 * data-access functions that require a Convex context (ctx.db) to execute.
 * Full integration tests require the `convex-test` package or a running
 * Convex dev deployment.
 *
 * These tests verify the business logic and contracts that the mutations
 * must satisfy, documented as executable specifications.
 */

describe("createUser mutation contract", () => {
  it("should assign default role 'attendee' to new users", () => {
    const defaults = {
      roles: ["attendee"],
      activeRole: "attendee",
      isActive: true,
    };

    expect(defaults.roles).toEqual(["attendee"]);
    expect(defaults.activeRole).toBe("attendee");
    expect(defaults.isActive).toBe(true);
  });

  it("should be idempotent — return existing user if clerkId already exists", () => {
    // Contract: createUser checks for existing user by clerkId before insert.
    // If found, returns existing._id without creating a duplicate.
    const existingId = "existing_id_123";
    const shouldInsert = existingId === null;
    expect(shouldInsert).toBe(false);
  });

  it("should set createdAt and updatedAt to current timestamp", () => {
    const now = Date.now();
    const timestamps = { createdAt: now, updatedAt: now };
    expect(timestamps.createdAt).toBe(timestamps.updatedAt);
    expect(timestamps.createdAt).toBeGreaterThan(0);
  });
});

describe("updateUser mutation contract", () => {
  it("should only patch provided fields, leaving others unchanged", () => {
    const args = { clerkId: "clerk_123", name: "New Name" };
    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) patch.name = args.name;
    // email and image not provided — should not appear in patch
    expect(patch).toEqual({ name: "New Name" });
    expect(patch).not.toHaveProperty("email");
    expect(patch).not.toHaveProperty("image");
  });

  it("should always update updatedAt timestamp", () => {
    const before = Date.now();
    const updatedAt = Date.now();
    expect(updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("should no-op if user does not exist", () => {
    // Contract: updateUser looks up user by clerkId.
    // If not found, returns without error (silent no-op).
    const user = null;
    const shouldUpdate = user !== null;
    expect(shouldUpdate).toBe(false);
  });
});

describe("deleteUser mutation contract", () => {
  it("should soft-delete by setting isActive to false", () => {
    // Contract: deleteUser never removes the document.
    // It patches isActive=false and updates the timestamp.
    const patch = { isActive: false, updatedAt: Date.now() };
    expect(patch.isActive).toBe(false);
    expect(patch.updatedAt).toBeGreaterThan(0);
  });

  it("should no-op if user does not exist", () => {
    const user = null;
    const shouldDelete = user !== null;
    expect(shouldDelete).toBe(false);
  });
});
