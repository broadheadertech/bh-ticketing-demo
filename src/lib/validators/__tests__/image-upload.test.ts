import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "../image-upload";

function createMockFile(type: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], "test-file", { type });
}

describe("validateImageFile", () => {
  it("accepts valid JPEG file", () => {
    const file = createMockFile("image/jpeg", 1024);
    expect(validateImageFile(file)).toEqual({ valid: true });
  });

  it("accepts valid PNG file", () => {
    const file = createMockFile("image/png", 1024);
    expect(validateImageFile(file)).toEqual({ valid: true });
  });

  it("accepts valid WebP file", () => {
    const file = createMockFile("image/webp", 1024);
    expect(validateImageFile(file)).toEqual({ valid: true });
  });

  it("rejects GIF file", () => {
    const file = createMockFile("image/gif", 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects PDF file", () => {
    const file = createMockFile("application/pdf", 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects oversized file", () => {
    const file = createMockFile("image/jpeg", MAX_IMAGE_SIZE_BYTES + 1);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("File too large");
  });

  it("accepts file at exactly max size", () => {
    const file = createMockFile("image/jpeg", MAX_IMAGE_SIZE_BYTES);
    expect(validateImageFile(file)).toEqual({ valid: true });
  });

  it("rejects empty type", () => {
    const file = createMockFile("", 1024);
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
  });
});

describe("constants", () => {
  it("has correct accepted types", () => {
    expect(ACCEPTED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });

  it("has correct max size", () => {
    expect(MAX_IMAGE_SIZE_MB).toBe(5);
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
