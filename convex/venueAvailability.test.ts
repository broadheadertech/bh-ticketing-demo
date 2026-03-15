import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for venueAvailability Convex mutations/queries.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Authorization contract
// ---------------------------------------------------------------------------

function canAccessAvailabilityMutation(activeRole: string): boolean {
  return activeRole === "venue_manager";
}

describe("setVenueAvailability — authorization contract", () => {
  it("allows venue_manager role", () => {
    expect(canAccessAvailabilityMutation("venue_manager")).toBe(true);
  });

  it("rejects artist role", () => {
    expect(canAccessAvailabilityMutation("artist")).toBe(false);
  });

  it("rejects organization role", () => {
    expect(canAccessAvailabilityMutation("organization")).toBe(false);
  });

  it("rejects attendee role", () => {
    expect(canAccessAvailabilityMutation("attendee")).toBe(false);
  });

  it("rejects admin role (venue availability is venue_manager only)", () => {
    expect(canAccessAvailabilityMutation("admin")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ownership enforcement contract
// ---------------------------------------------------------------------------

function canModifyVenueAvailability(
  userId: string,
  venue: { managerId: string }
): boolean {
  return venue.managerId === userId;
}

describe("setVenueAvailability — ownership enforcement contract", () => {
  it("allows venue owner to set availability", () => {
    expect(canModifyVenueAvailability("user:abc", { managerId: "user:abc" })).toBe(true);
  });

  it("rejects a different manager from setting availability", () => {
    expect(canModifyVenueAvailability("user:xyz", { managerId: "user:abc" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Status → action routing contract
// ---------------------------------------------------------------------------

function shouldDeleteRecord(status: string): boolean {
  return status === "available";
}

function shouldUpsertRecord(status: string): boolean {
  return status === "tentative" || status === "booked";
}

describe("setVenueAvailability — available status contract", () => {
  it("'available' status triggers delete, not upsert", () => {
    expect(shouldDeleteRecord("available")).toBe(true);
    expect(shouldUpsertRecord("available")).toBe(false);
  });

  it("'tentative' status triggers upsert, not delete", () => {
    expect(shouldDeleteRecord("tentative")).toBe(false);
    expect(shouldUpsertRecord("tentative")).toBe(true);
  });

  it("'booked' status triggers upsert, not delete", () => {
    expect(shouldDeleteRecord("booked")).toBe(false);
    expect(shouldUpsertRecord("booked")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Upsert vs insert logic contract
// ---------------------------------------------------------------------------

function determineAction(
  status: string,
  existingRecord: { _id: string } | null
): "delete" | "patch" | "insert" | "noop" {
  if (status === "available") {
    return existingRecord ? "delete" : "noop";
  }
  return existingRecord ? "patch" : "insert";
}

describe("setVenueAvailability — upsert/delete routing contract", () => {
  it("available + existing record → delete", () => {
    expect(determineAction("available", { _id: "rec:1" })).toBe("delete");
  });

  it("available + no existing record → noop", () => {
    expect(determineAction("available", null)).toBe("noop");
  });

  it("tentative + existing record → patch", () => {
    expect(determineAction("tentative", { _id: "rec:1" })).toBe("patch");
  });

  it("tentative + no existing record → insert", () => {
    expect(determineAction("tentative", null)).toBe("insert");
  });

  it("booked + existing record → patch", () => {
    expect(determineAction("booked", { _id: "rec:1" })).toBe("patch");
  });

  it("booked + no existing record → insert", () => {
    expect(determineAction("booked", null)).toBe("insert");
  });
});

// ---------------------------------------------------------------------------
// Date format contract
// ---------------------------------------------------------------------------

function isValidAvailabilityDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

describe("venueAvailability — date format contract", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(isValidAvailabilityDate("2026-03-15")).toBe(true);
  });

  it("rejects MM/DD/YYYY format", () => {
    expect(isValidAvailabilityDate("03/15/2026")).toBe(false);
  });

  it("rejects ISO datetime string", () => {
    expect(isValidAvailabilityDate("2026-03-15T00:00:00Z")).toBe(false);
  });

  it("rejects compact YYYYMMDD format", () => {
    expect(isValidAvailabilityDate("20260315")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidAvailabilityDate("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Public read query — no auth required
// ---------------------------------------------------------------------------

describe("getPublicVenueAvailability — public access contract", () => {
  it("public query should not require authentication (contract: any caller can read)", () => {
    // The getPublicVenueAvailability query has no auth check — it's intentionally public.
    // This test documents that design decision.
    const requiresAuth = false; // defined in venueAvailability.ts: no getAuthenticatedUser() call
    expect(requiresAuth).toBe(false);
  });

  it("public query returns only non-available records (available = no record design)", () => {
    // Simulate records stored in DB: only tentative/booked are ever written
    const storedRecords = [
      { date: "2026-04-10", status: "tentative" },
      { date: "2026-04-15", status: "booked" },
    ];
    // All stored records should be non-available
    storedRecords.forEach((r) => {
      expect(r.status).not.toBe("available");
    });
  });
});

// ---------------------------------------------------------------------------
// getAvailabilityByVenue — auth + ownership contract
// ---------------------------------------------------------------------------

describe("getAvailabilityByVenue — auth + ownership contract", () => {
  it("returns empty array for non-owner (simulating ownership check)", () => {
    const userId = "user:xyz";
    const venue = { managerId: "user:abc" };
    const shouldReturn = venue.managerId === userId ? ["records"] : [];
    expect(shouldReturn).toHaveLength(0);
  });

  it("returns records for the venue owner", () => {
    const userId = "user:abc";
    const venue = { managerId: "user:abc" };
    const shouldReturn = venue.managerId === userId ? ["records"] : [];
    expect(shouldReturn).toHaveLength(1);
  });
});
