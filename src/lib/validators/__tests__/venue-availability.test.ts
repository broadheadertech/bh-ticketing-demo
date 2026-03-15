import { describe, it, expect } from "vitest";
import {
  setAvailabilitySchema,
  AVAILABILITY_STATUSES,
} from "@/lib/validators/venue-availability";

/**
 * Pure contract tests for venue availability Zod schema.
 */

const validBase = {
  date: "2026-03-15",
  status: "available" as const,
};

describe("setAvailabilitySchema — date field", () => {
  it("accepts a valid ISO date string", () => {
    expect(setAvailabilitySchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects a date with no separators", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "20260315" });
    expect(result.success).toBe(false);
  });

  it("rejects a date in MM/DD/YYYY format", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "03/15/2026" });
    expect(result.success).toBe(false);
  });

  it("rejects an ISO datetime string (includes time)", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "2026-03-15T00:00:00Z" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "" });
    expect(result.success).toBe(false);
  });

  it("accepts the first day of the year", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "2026-01-01" });
    expect(result.success).toBe(true);
  });

  it("accepts the last day of the year", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, date: "2026-12-31" });
    expect(result.success).toBe(true);
  });
});

describe("setAvailabilitySchema — status field", () => {
  it("accepts 'available'", () => {
    expect(setAvailabilitySchema.safeParse({ ...validBase, status: "available" }).success).toBe(true);
  });

  it("accepts 'tentative'", () => {
    expect(setAvailabilitySchema.safeParse({ ...validBase, status: "tentative" }).success).toBe(true);
  });

  it("accepts 'booked'", () => {
    expect(setAvailabilitySchema.safeParse({ ...validBase, status: "booked" }).success).toBe(true);
  });

  it("rejects an unknown status string", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, status: "unavailable" });
    expect(result.success).toBe(false);
  });

  it("rejects empty status", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, status: "" });
    expect(result.success).toBe(false);
  });
});

describe("setAvailabilitySchema — notes field", () => {
  it("notes is optional", () => {
    expect(setAvailabilitySchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts a short note", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, notes: "Hold for corporate client" });
    expect(result.success).toBe(true);
  });

  it("accepts notes exactly 500 chars", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, notes: "A".repeat(500) });
    expect(result.success).toBe(true);
  });

  it("rejects notes longer than 500 chars", () => {
    const result = setAvailabilitySchema.safeParse({ ...validBase, notes: "A".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("AVAILABILITY_STATUSES constant", () => {
  it("contains exactly 3 statuses", () => {
    expect(AVAILABILITY_STATUSES).toHaveLength(3);
  });

  it("contains available, tentative, and booked", () => {
    expect(AVAILABILITY_STATUSES).toContain("available");
    expect(AVAILABILITY_STATUSES).toContain("tentative");
    expect(AVAILABILITY_STATUSES).toContain("booked");
  });
});

describe("setAvailabilitySchema — full valid input", () => {
  it("parses a complete valid form submission", () => {
    const result = setAvailabilitySchema.safeParse({
      date: "2026-04-20",
      status: "tentative",
      notes: "Tentatively held for wedding reception.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe("2026-04-20");
      expect(result.data.status).toBe("tentative");
      expect(result.data.notes).toBe("Tentatively held for wedding reception.");
    }
  });
});
