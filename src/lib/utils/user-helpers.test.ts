import { describe, it, expect } from "vitest";
import { extractUserFromClerkEvent } from "./user-helpers";

describe("extractUserFromClerkEvent", () => {
  it("extracts full name from first and last name", () => {
    const result = extractUserFromClerkEvent({
      id: "clerk_123",
      first_name: "John",
      last_name: "Doe",
      email_addresses: [{ email_address: "john@example.com" }],
      image_url: "https://img.clerk.com/photo.jpg",
    });

    expect(result).toEqual({
      clerkId: "clerk_123",
      name: "John Doe",
      email: "john@example.com",
      image: "https://img.clerk.com/photo.jpg",
    });
  });

  it("handles missing last name", () => {
    const result = extractUserFromClerkEvent({
      id: "clerk_456",
      first_name: "Jane",
      last_name: null,
      email_addresses: [{ email_address: "jane@example.com" }],
      image_url: null,
    });

    expect(result).toEqual({
      clerkId: "clerk_456",
      name: "Jane",
      email: "jane@example.com",
      image: undefined,
    });
  });

  it('defaults to "User" when no name provided', () => {
    const result = extractUserFromClerkEvent({
      id: "clerk_789",
      first_name: null,
      last_name: null,
      email_addresses: [{ email_address: "anon@example.com" }],
      image_url: null,
    });

    expect(result.name).toBe("User");
  });

  it("handles missing email addresses", () => {
    const result = extractUserFromClerkEvent({
      id: "clerk_000",
      first_name: "Test",
      email_addresses: [],
      image_url: null,
    });

    expect(result.email).toBe("");
  });

  it("handles undefined email_addresses", () => {
    const result = extractUserFromClerkEvent({
      id: "clerk_111",
      first_name: "Test",
    });

    expect(result.email).toBe("");
    expect(result.image).toBeUndefined();
  });
});
