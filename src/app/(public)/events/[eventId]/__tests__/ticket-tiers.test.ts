import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Pure contract tests for ticket tier display logic in EventDetailClient.
 * Tests the business rules for sold-out detection, availability calculation,
 * free tier detection, and CTA button routing.
 */

type Tier = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  sortOrder: number;
};

// Pure helpers mirroring EventDetailClient logic
function isTierSoldOut(tier: Pick<Tier, "soldCount" | "quantity">): boolean {
  return tier.soldCount >= tier.quantity;
}

function getAvailability(tier: Pick<Tier, "soldCount" | "quantity">): number {
  return Math.max(0, tier.quantity - tier.soldCount);
}

function isFreeEvent(tiers: Pick<Tier, "price">[]): boolean {
  return tiers.length > 0 && tiers.every((t) => t.price === 0);
}

function allTiersSoldOut(tiers: Pick<Tier, "soldCount" | "quantity">[]): boolean {
  return tiers.length > 0 && tiers.every((t) => t.soldCount >= t.quantity);
}

type CtaVariant = "sold-out" | "free" | "paid-stripe" | "paid-no-stripe" | "empty";
function getCTAVariant(
  tiers: Tier[],
  creatorStripeAccountId: string | null
): CtaVariant {
  if (tiers.length === 0) return "empty";
  if (allTiersSoldOut(tiers)) return "sold-out";
  if (isFreeEvent(tiers)) return "free";
  if (tiers.some((t) => t.price > 0) && creatorStripeAccountId) return "paid-stripe";
  return "paid-no-stripe";
}

// ---------------------------------------------------------------------------

describe("isTierSoldOut", () => {
  it("returns true when soldCount equals quantity", () => {
    expect(isTierSoldOut({ soldCount: 100, quantity: 100 })).toBe(true);
  });

  it("returns true when soldCount exceeds quantity", () => {
    expect(isTierSoldOut({ soldCount: 101, quantity: 100 })).toBe(true);
  });

  it("returns false when available tickets remain", () => {
    expect(isTierSoldOut({ soldCount: 99, quantity: 100 })).toBe(false);
  });

  it("returns false when soldCount is 0", () => {
    expect(isTierSoldOut({ soldCount: 0, quantity: 50 })).toBe(false);
  });

  it("returns false when quantity is 1 and soldCount is 0", () => {
    expect(isTierSoldOut({ soldCount: 0, quantity: 1 })).toBe(false);
  });
});

describe("getAvailability", () => {
  it("returns quantity minus soldCount", () => {
    expect(getAvailability({ soldCount: 30, quantity: 100 })).toBe(70);
  });

  it("returns 0 when sold out (not negative)", () => {
    expect(getAvailability({ soldCount: 100, quantity: 100 })).toBe(0);
  });

  it("returns 0 when oversold (not negative)", () => {
    expect(getAvailability({ soldCount: 105, quantity: 100 })).toBe(0);
  });

  it("returns full quantity when nothing sold", () => {
    expect(getAvailability({ soldCount: 0, quantity: 50 })).toBe(50);
  });
});

describe("isFreeEvent", () => {
  it("returns true when all tiers have price 0", () => {
    const tiers = [{ price: 0 }, { price: 0 }];
    expect(isFreeEvent(tiers)).toBe(true);
  });

  it("returns false when any tier has a price > 0", () => {
    const tiers = [{ price: 0 }, { price: 30000 }];
    expect(isFreeEvent(tiers)).toBe(false);
  });

  it("returns false for empty tiers array", () => {
    expect(isFreeEvent([])).toBe(false);
  });

  it("returns true for single free tier", () => {
    expect(isFreeEvent([{ price: 0 }])).toBe(true);
  });

  it("returns false for single paid tier", () => {
    expect(isFreeEvent([{ price: 50000 }])).toBe(false);
  });
});

describe("allTiersSoldOut", () => {
  it("returns true when all tiers are sold out", () => {
    const tiers = [
      { soldCount: 100, quantity: 100 },
      { soldCount: 50, quantity: 50 },
    ];
    expect(allTiersSoldOut(tiers)).toBe(true);
  });

  it("returns false when at least one tier has availability", () => {
    const tiers = [
      { soldCount: 100, quantity: 100 },
      { soldCount: 49, quantity: 50 },
    ];
    expect(allTiersSoldOut(tiers)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(allTiersSoldOut([])).toBe(false);
  });
});

describe("getCTAVariant", () => {
  const makeTier = (overrides: Partial<Tier>): Tier => ({
    _id: "t1",
    name: "GA",
    price: 30000,
    quantity: 100,
    soldCount: 0,
    sortOrder: 1,
    ...overrides,
  });

  it("empty tiers → 'empty'", () => {
    expect(getCTAVariant([], "acct_1234")).toBe("empty");
  });

  it("all tiers sold out → 'sold-out'", () => {
    const tiers = [makeTier({ soldCount: 100, quantity: 100 })];
    expect(getCTAVariant(tiers, "acct_1234")).toBe("sold-out");
  });

  it("all free tiers → 'free'", () => {
    const tiers = [makeTier({ price: 0 })];
    expect(getCTAVariant(tiers, null)).toBe("free");
  });

  it("paid tiers with Stripe account → 'paid-stripe'", () => {
    const tiers = [makeTier({ price: 50000 })];
    expect(getCTAVariant(tiers, "acct_1234")).toBe("paid-stripe");
  });

  it("paid tiers without Stripe account → 'paid-no-stripe'", () => {
    const tiers = [makeTier({ price: 50000 })];
    expect(getCTAVariant(tiers, null)).toBe("paid-no-stripe");
  });

  it("sold-out takes priority over free-event check", () => {
    const tiers = [makeTier({ price: 0, soldCount: 50, quantity: 50 })];
    expect(getCTAVariant(tiers, null)).toBe("sold-out");
  });

  it("mixed free + paid tiers with Stripe → 'paid-stripe' (not free)", () => {
    const tiers = [makeTier({ price: 0 }), makeTier({ _id: "t2", price: 50000 })];
    expect(getCTAVariant(tiers, "acct_1234")).toBe("paid-stripe");
  });

  it("mixed free + paid tiers without Stripe → 'paid-no-stripe'", () => {
    const tiers = [makeTier({ price: 0 }), makeTier({ _id: "t2", price: 50000 })];
    expect(getCTAVariant(tiers, null)).toBe("paid-no-stripe");
  });
});

describe("ticket tier price formatting contract", () => {
  it("formatCurrency renders PHP format for paid tier", () => {
    const formatted = formatCurrency(30000);
    expect(formatted).toMatch(/₱|PHP/);
    expect(formatted).toContain("300");
  });

  it("formatCurrency returns 'Free' for price 0", () => {
    expect(formatCurrency(0)).toBe("Free");
  });

  it("formatCurrency handles large prices correctly", () => {
    const formatted = formatCurrency(100000);
    expect(formatted).toContain("1,000");
  });
});

describe("tier sort order contract", () => {
  it("tiers sorted by sortOrder ascending (lowest first)", () => {
    const tiers: Tier[] = [
      { _id: "t3", name: "VIP", price: 80000, quantity: 20, soldCount: 0, sortOrder: 3 },
      { _id: "t1", name: "GA", price: 30000, quantity: 100, soldCount: 0, sortOrder: 1 },
      { _id: "t2", name: "Premium", price: 50000, quantity: 50, soldCount: 0, sortOrder: 2 },
    ];
    const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(sorted[0]._id).toBe("t1");
    expect(sorted[1]._id).toBe("t2");
    expect(sorted[2]._id).toBe("t3");
  });
});
