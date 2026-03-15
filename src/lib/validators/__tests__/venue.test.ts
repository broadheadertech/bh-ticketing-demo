import { describe, it, expect } from "vitest";
import { createVenueSchema } from "@/lib/validators/venue";

/**
 * Pure contract tests for venue form validation (createVenueSchema).
 */

const validBase = {
  name: "The Loft Makati",
  location: "Makati City, Metro Manila",
  capacity: 300,
  amenities: [],
};

describe("createVenueSchema — name field", () => {
  it("accepts a valid name", () => {
    expect(createVenueSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createVenueSchema.safeParse({ ...validBase, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name that is only whitespace", () => {
    const result = createVenueSchema.safeParse({ ...validBase, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 100 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, name: "A".repeat(100) });
    expect(result.success).toBe(true);
  });
});

describe("createVenueSchema — location field", () => {
  it("rejects empty location", () => {
    const result = createVenueSchema.safeParse({ ...validBase, location: "" });
    expect(result.success).toBe(false);
  });

  it("rejects location longer than 200 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, location: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("accepts location exactly 200 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, location: "A".repeat(200) });
    expect(result.success).toBe(true);
  });
});

describe("createVenueSchema — capacity field", () => {
  it("accepts valid integer capacity", () => {
    expect(createVenueSchema.safeParse({ ...validBase, capacity: 500 }).success).toBe(true);
  });

  it("rejects capacity of 0", () => {
    const result = createVenueSchema.safeParse({ ...validBase, capacity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative capacity", () => {
    const result = createVenueSchema.safeParse({ ...validBase, capacity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects capacity over 100000", () => {
    const result = createVenueSchema.safeParse({ ...validBase, capacity: 100001 });
    expect(result.success).toBe(false);
  });

  it("accepts capacity of exactly 100000", () => {
    expect(createVenueSchema.safeParse({ ...validBase, capacity: 100000 }).success).toBe(true);
  });

  it("rejects decimal capacity", () => {
    const result = createVenueSchema.safeParse({ ...validBase, capacity: 1.5 });
    expect(result.success).toBe(false);
  });

  it("coerces string number to number (DOM input behaviour)", () => {
    // z.coerce.number() handles string inputs from form DOM
    const result = createVenueSchema.safeParse({ ...validBase, capacity: "300" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.capacity).toBe(300);
  });
});

describe("createVenueSchema — description field", () => {
  it("description is optional", () => {
    const result = createVenueSchema.safeParse({ ...validBase });
    expect(result.success).toBe(true);
  });

  it("accepts empty string description", () => {
    const result = createVenueSchema.safeParse({ ...validBase, description: "" });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 2000 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, description: "A".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts description exactly 2000 chars", () => {
    const result = createVenueSchema.safeParse({ ...validBase, description: "A".repeat(2000) });
    expect(result.success).toBe(true);
  });
});

describe("createVenueSchema — amenities field", () => {
  it("accepts empty amenities array", () => {
    expect(createVenueSchema.safeParse({ ...validBase, amenities: [] }).success).toBe(true);
  });

  it("accepts up to 20 amenities", () => {
    const amenities = Array.from({ length: 20 }, (_, i) => `Amenity ${i + 1}`);
    expect(createVenueSchema.safeParse({ ...validBase, amenities }).success).toBe(true);
  });

  it("rejects more than 20 amenities", () => {
    const amenities = Array.from({ length: 21 }, (_, i) => `Amenity ${i + 1}`);
    const result = createVenueSchema.safeParse({ ...validBase, amenities });
    expect(result.success).toBe(false);
  });
});

describe("createVenueSchema — full valid input", () => {
  it("parses a complete valid venue form submission", () => {
    const result = createVenueSchema.safeParse({
      name: "The Loft Makati",
      location: "G/F Salcedo Village, Makati City",
      capacity: 300,
      description: "Versatile event space with full AV system.",
      amenities: ["PA System", "Projector", "Bar Service", "Parking"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("The Loft Makati");
      expect(result.data.capacity).toBe(300);
      expect(result.data.amenities).toHaveLength(4);
    }
  });
});
