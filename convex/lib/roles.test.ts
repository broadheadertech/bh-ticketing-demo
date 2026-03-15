import { describe, it, expect } from "vitest";
import { isValidRole, requireRole, requireAnyRole, VALID_ROLES, SELF_ASSIGNABLE_ROLES } from "./roles";

describe("VALID_ROLES", () => {
  it("contains all 6 expected roles", () => {
    expect(VALID_ROLES).toEqual([
      "attendee",
      "artist",
      "organization",
      "venue_manager",
      "admin",
      "staff",
    ]);
  });
});

describe("SELF_ASSIGNABLE_ROLES", () => {
  it("contains 4 roles excluding admin", () => {
    expect(SELF_ASSIGNABLE_ROLES).toEqual([
      "attendee",
      "artist",
      "organization",
      "venue_manager",
    ]);
  });

  it("does not include admin", () => {
    expect(SELF_ASSIGNABLE_ROLES).not.toContain("admin");
  });

  it("is a subset of VALID_ROLES", () => {
    for (const role of SELF_ASSIGNABLE_ROLES) {
      expect(VALID_ROLES).toContain(role);
    }
  });
});

describe("isValidRole", () => {
  it("returns true for valid roles", () => {
    expect(isValidRole("attendee")).toBe(true);
    expect(isValidRole("artist")).toBe(true);
    expect(isValidRole("organization")).toBe(true);
    expect(isValidRole("venue_manager")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
  });

  it("returns false for invalid roles", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("ADMIN")).toBe(false);
    expect(isValidRole("moderator")).toBe(false);
  });
});

describe("requireRole", () => {
  it("does not throw when user has the required active role", () => {
    const user = { activeRole: "artist" };
    expect(() => requireRole(user, "artist")).not.toThrow();
  });

  it("throws when user has a different active role", () => {
    const user = { activeRole: "attendee" };
    expect(() => requireRole(user, "artist")).toThrow(
      'This action requires the "artist" role'
    );
  });

  it("throws when user is null", () => {
    expect(() => requireRole(null, "artist")).toThrow("User not found");
  });
});

describe("requireAnyRole", () => {
  it("does not throw when user has one of the required roles", () => {
    const user = { activeRole: "artist" };
    expect(() =>
      requireAnyRole(user, ["artist", "organization"])
    ).not.toThrow();
  });

  it("throws when user has none of the required roles", () => {
    const user = { activeRole: "attendee" };
    expect(() =>
      requireAnyRole(user, ["artist", "organization"])
    ).toThrow("This action requires one of these roles: artist, organization");
  });

  it("throws when user is null", () => {
    expect(() => requireAnyRole(null, ["admin"])).toThrow("User not found");
  });
});
