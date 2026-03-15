import { describe, it, expect } from "vitest";
import { creatorProfileSchema } from "../creator-profile";

describe("creatorProfileSchema", () => {
  it("accepts valid profile with all fields", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test Artist",
      bio: "A short bio",
      profilePhotoUrl: "https://example.com/photo.jpg",
      websiteUrl: "https://example.com",
      instagramUrl: "https://instagram.com/test",
      spotifyUrl: "https://open.spotify.com/artist/123",
      facebookUrl: "https://facebook.com/test",
    });
    expect(result.success).toBe(true);
  });

  it("accepts profile with only displayName", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test Artist",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty displayName", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Display name is required");
    }
  });

  it("rejects displayName over 100 characters", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Display name must be 100 characters or less"
      );
    }
  });

  it("rejects whitespace-only displayName", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects bio over 2000 characters", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test",
      bio: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Bio must be 2000 characters or less"
      );
    }
  });

  it("accepts bio at exactly 2000 characters", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test",
      bio: "x".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for optional URL fields", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test",
      websiteUrl: "",
      instagramUrl: "",
      spotifyUrl: "",
      facebookUrl: "",
      profilePhotoUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test",
      websiteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Must be a valid URL");
    }
  });

  it("accepts empty string for bio", () => {
    const result = creatorProfileSchema.safeParse({
      displayName: "Test",
      bio: "",
    });
    expect(result.success).toBe(true);
  });
});
