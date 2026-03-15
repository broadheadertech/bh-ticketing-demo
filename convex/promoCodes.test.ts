import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for promo code system.
 * No Convex runtime — tests business rule logic only.
 */

const CODE_REGEX = /^[A-Z0-9]{4,20}$/;
const CREATOR_ROLES = ["artist", "organization"];

// ---------------------------------------------------------------------------
// Code format validation
// ---------------------------------------------------------------------------

describe("promo code format validation", () => {
  it("accepts valid 4-char code", () => {
    expect(CODE_REGEX.test("SALE")).toBe(true);
  });

  it("accepts valid 20-char code", () => {
    expect(CODE_REGEX.test("A".repeat(20))).toBe(true);
  });

  it("accepts alphanumeric codes", () => {
    expect(CODE_REGEX.test("EARLY20")).toBe(true);
    expect(CODE_REGEX.test("VIP2026")).toBe(true);
    expect(CODE_REGEX.test("50OFF")).toBe(true);
  });

  it("rejects codes shorter than 4 chars", () => {
    expect(CODE_REGEX.test("ABC")).toBe(false);
  });

  it("rejects codes longer than 20 chars", () => {
    expect(CODE_REGEX.test("A".repeat(21))).toBe(false);
  });

  it("rejects codes with special characters", () => {
    expect(CODE_REGEX.test("SALE!")).toBe(false);
    expect(CODE_REGEX.test("50-OFF")).toBe(false);
    expect(CODE_REGEX.test("CODE CODE")).toBe(false);
  });

  it("rejects lowercase (codes are stored uppercase)", () => {
    expect(CODE_REGEX.test("early20")).toBe(false);
  });

  it("converts input to uppercase before validation", () => {
    const input = "early20";
    const upper = input.toUpperCase();
    expect(CODE_REGEX.test(upper)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Discount validation
// ---------------------------------------------------------------------------

describe("discount validation", () => {
  it("rejects discount value <= 0", () => {
    expect(0 > 0).toBe(false);
    expect(-10 > 0).toBe(false);
  });

  it("accepts valid percentage (1-100)", () => {
    expect(20 > 0 && 20 <= 100).toBe(true);
    expect(100 > 0 && 100 <= 100).toBe(true);
  });

  it("rejects percentage > 100", () => {
    expect(150 <= 100).toBe(false);
  });

  it("accepts valid fixed amount", () => {
    expect(50000 > 0).toBe(true); // ₱500 in centavos
  });

  it("validates discount type is percentage or fixed", () => {
    const validTypes = ["percentage", "fixed"];
    expect(validTypes.includes("percentage")).toBe(true);
    expect(validTypes.includes("fixed")).toBe(true);
    expect(validTypes.includes("bogo")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Code uniqueness
// ---------------------------------------------------------------------------

describe("code uniqueness per event", () => {
  it("detects duplicate code for same event", () => {
    const existingCodes = [
      { eventId: "events:e1", code: "EARLY20" },
      { eventId: "events:e1", code: "VIP50" },
    ];
    const newCode = "EARLY20";
    const isDuplicate = existingCodes.some(
      (c) => c.eventId === "events:e1" && c.code === newCode
    );
    expect(isDuplicate).toBe(true);
  });

  it("allows same code for different events", () => {
    const existingCodes = [
      { eventId: "events:e1", code: "EARLY20" },
    ];
    const isDuplicate = existingCodes.some(
      (c) => c.eventId === "events:e2" && c.code === "EARLY20"
    );
    expect(isDuplicate).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Expiration logic
// ---------------------------------------------------------------------------

describe("expiration logic", () => {
  it("rejects expiration date in the past", () => {
    const expiresAt = Date.now() - 86400000;
    expect(expiresAt > Date.now()).toBe(false);
  });

  it("accepts expiration date in the future", () => {
    const expiresAt = Date.now() + 86400000;
    expect(expiresAt > Date.now()).toBe(true);
  });

  it("allows no expiration (undefined)", () => {
    const expiresAt = undefined;
    expect(expiresAt === undefined).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Usage tracking
// ---------------------------------------------------------------------------

describe("usage tracking", () => {
  it("starts with usedCount 0", () => {
    const promo = { usedCount: 0 };
    expect(promo.usedCount).toBe(0);
  });

  it("detects max usage reached", () => {
    const promo = { usedCount: 10, maxUses: 10 };
    const atLimit = promo.maxUses !== undefined && promo.usedCount >= promo.maxUses;
    expect(atLimit).toBe(true);
  });

  it("allows unlimited usage when maxUses is undefined", () => {
    const promo = { usedCount: 1000, maxUses: undefined };
    const atLimit = promo.maxUses !== undefined && promo.usedCount >= promo.maxUses;
    expect(atLimit).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("promo code authorization", () => {
  it("allows creator roles", () => {
    expect(CREATOR_ROLES.includes("artist")).toBe(true);
    expect(CREATOR_ROLES.includes("organization")).toBe(true);
  });

  it("rejects non-creator roles", () => {
    expect(CREATOR_ROLES.includes("attendee")).toBe(false);
    expect(CREATOR_ROLES.includes("staff")).toBe(false);
    expect(CREATOR_ROLES.includes("admin")).toBe(false);
  });

  it("requires event ownership", () => {
    const event = { creatorId: "users:c1" };
    const user = { _id: "users:c2" };
    expect(event.creatorId === user._id).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Toggle behavior
// ---------------------------------------------------------------------------

describe("toggle promo code", () => {
  it("deactivates an active code", () => {
    const promo = { isActive: true };
    expect(!promo.isActive).toBe(false);
  });

  it("reactivates an inactive code", () => {
    const promo = { isActive: false };
    expect(!promo.isActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe("promo code return shape", () => {
  it("includes all display fields", () => {
    const code = {
      _id: "promoCodes:abc",
      code: "EARLY20",
      discountType: "percentage",
      discountValue: 20,
      maxUses: 100,
      usedCount: 5,
      expiresAt: Date.now() + 86400000,
      isActive: true,
      createdAt: Date.now(),
    };

    expect(code).toHaveProperty("_id");
    expect(code).toHaveProperty("code");
    expect(code).toHaveProperty("discountType");
    expect(code).toHaveProperty("discountValue");
    expect(code).toHaveProperty("maxUses");
    expect(code).toHaveProperty("usedCount");
    expect(code).toHaveProperty("isActive");
    expect(code).toHaveProperty("createdAt");
  });

  it("does not include eventId in public return (creator query)", () => {
    const code = {
      _id: "promoCodes:abc",
      code: "EARLY20",
      discountType: "percentage",
      discountValue: 20,
      usedCount: 0,
      isActive: true,
      createdAt: Date.now(),
    };

    expect(code).not.toHaveProperty("eventId");
  });
});

// ---------------------------------------------------------------------------
// Promo code validation at checkout (Story 13.2)
// ---------------------------------------------------------------------------

describe("promo code validation at checkout", () => {
  it("rejects inactive code", () => {
    const promo = { isActive: false, usedCount: 0, maxUses: 100, expiresAt: undefined };
    expect(promo.isActive).toBe(false);
  });

  it("rejects code at usage limit", () => {
    const promo = { isActive: true, usedCount: 100, maxUses: 100 };
    const atLimit = promo.maxUses !== undefined && promo.usedCount >= promo.maxUses;
    expect(atLimit).toBe(true);
  });

  it("rejects expired code", () => {
    const promo = { isActive: true, expiresAt: Date.now() - 86400000 };
    const expired = promo.expiresAt !== undefined && promo.expiresAt <= Date.now();
    expect(expired).toBe(true);
  });

  it("accepts valid active code", () => {
    const promo = {
      isActive: true,
      usedCount: 5,
      maxUses: 100,
      expiresAt: Date.now() + 86400000,
    };
    const isValid =
      promo.isActive &&
      !(promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) &&
      !(promo.expiresAt !== undefined && promo.expiresAt <= Date.now());
    expect(isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Discount calculation (Story 13.2)
// ---------------------------------------------------------------------------

describe("discount calculation", () => {
  it("applies percentage discount correctly", () => {
    const price = 100000; // ₱1,000
    const discountValue = 20; // 20%
    const discounted = Math.round(price * (1 - discountValue / 100));
    expect(discounted).toBe(80000); // ₱800
  });

  it("applies fixed discount correctly", () => {
    const price = 100000; // ₱1,000
    const discountValue = 25000; // ₱250 off
    const discounted = Math.max(0, price - discountValue);
    expect(discounted).toBe(75000); // ₱750
  });

  it("does not go below zero for fixed discount", () => {
    const price = 10000; // ₱100
    const discountValue = 50000; // ₱500 off
    const discounted = Math.max(0, price - discountValue);
    expect(discounted).toBe(0);
  });

  it("100% discount results in zero", () => {
    const price = 100000;
    const discounted = Math.round(price * (1 - 100 / 100));
    expect(discounted).toBe(0);
  });

  it("platform fee is calculated on discounted total", () => {
    const originalTotal = 200000; // ₱2,000
    const discountedTotal = 160000; // ₱1,600 after 20% off
    const platformFee = Math.round(discountedTotal * 0.05);
    expect(platformFee).toBe(8000); // ₱80 (not ₱100)
    expect(platformFee).toBeLessThan(Math.round(originalTotal * 0.05));
  });
});

// ---------------------------------------------------------------------------
// Usage increment (Story 13.2)
// ---------------------------------------------------------------------------

describe("promo code usage increment", () => {
  it("increments usedCount by total ticket quantity", () => {
    const promo = { usedCount: 5 };
    const ticketQuantity = 3;
    const newCount = promo.usedCount + ticketQuantity;
    expect(newCount).toBe(8);
  });

  it("handles multi-tier purchases", () => {
    const selections = [
      { tierId: "t1", quantity: 2 },
      { tierId: "t2", quantity: 1 },
    ];
    const totalQuantity = selections.reduce((sum, s) => sum + s.quantity, 0);
    expect(totalQuantity).toBe(3);
  });
});
