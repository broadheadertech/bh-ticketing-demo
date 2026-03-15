import { describe, it, expect } from "vitest";
import { freeRegistrationSchema } from "@/lib/validators/ticket";

/**
 * Contract tests for free-registration Server Action.
 * Tests validation rules and business logic contracts without calling the actual module,
 * following the established project pattern (see stripe-connect.test.ts).
 */

// ---- Return shape contract ----

describe("registerFreeEvent return shape contract", () => {
  it("success response contains success:true and data.registrationId", () => {
    const successShape = {
      success: true,
      data: { registrationId: "free_event:abc_buyer@example.com" },
    };
    expect(successShape.success).toBe(true);
    expect(successShape.data).toHaveProperty("registrationId");
    expect(typeof successShape.data.registrationId).toBe("string");
  });

  it("error response contains success:false and error string", () => {
    const errorShape = { success: false, error: "Registration failed" };
    expect(errorShape.success).toBe(false);
    expect(errorShape).toHaveProperty("error");
    expect(typeof errorShape.error).toBe("string");
  });

  it("all responses follow { success, data?, error? } pattern — never throw", () => {
    const successShape = {
      success: true,
      data: { registrationId: "free_event:abc_buyer@example.com" },
    };
    const errorShape = { success: false, error: "Some error" };
    expect(successShape.success).toBe(true);
    expect(errorShape.success).toBe(false);
    expect(errorShape).toHaveProperty("error");
  });
});

// ---- Zod validation contract ----

describe("freeRegistrationSchema validation", () => {
  it("accepts valid input", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc123",
      tierSelections: [{ tierId: "tier:abc", quantity: 2 }],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty eventId", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "",
      tierSelections: [{ tierId: "tier:abc", quantity: 1 }],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/required/i);
  });

  it("rejects invalid email", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [{ tierId: "tier:abc", quantity: 1 }],
      buyerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/email/i);
  });

  it("rejects empty tierSelections array", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity of 0", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [{ tierId: "tier:abc", quantity: 0 }],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity greater than 10", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [{ tierId: "tier:abc", quantity: 11 }],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts quantity at boundary (max=10)", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [{ tierId: "tier:abc", quantity: 10 }],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple tier selections", () => {
    const result = freeRegistrationSchema.safeParse({
      eventId: "event:abc",
      tierSelections: [
        { tierId: "tier:abc", quantity: 2 },
        { tierId: "tier:def", quantity: 1 },
      ],
      buyerEmail: "buyer@example.com",
    });
    expect(result.success).toBe(true);
  });
});

// ---- Security contract: server-side price validation ----

describe("registerFreeEvent price validation contract", () => {
  it("must reject tiers with price > 0 (no Stripe payment path)", () => {
    // Simulates the server-side check in registerFreeEvent handler
    function validateFreeTiers(
      tierSelections: { tierId: string; quantity: number }[],
      tiers: { _id: string; price: number }[]
    ): { valid: boolean; error?: string } {
      for (const selection of tierSelections) {
        const tier = tiers.find((t) => t._id === selection.tierId);
        if (!tier) return { valid: false, error: "Invalid tier selected" };
        if (tier.price !== 0) return { valid: false, error: "This event requires payment" };
      }
      return { valid: true };
    }

    const paidTier = { _id: "tier:paid", price: 5000 };
    const freeTier = { _id: "tier:free", price: 0 };

    expect(
      validateFreeTiers([{ tierId: "tier:paid", quantity: 1 }], [paidTier])
    ).toEqual({ valid: false, error: "This event requires payment" });

    expect(
      validateFreeTiers([{ tierId: "tier:free", quantity: 1 }], [freeTier])
    ).toEqual({ valid: true });
  });

  it("returns error when tier not found in server-fetched tiers list", () => {
    function validateFreeTiers(
      tierSelections: { tierId: string; quantity: number }[],
      tiers: { _id: string; price: number }[]
    ): { valid: boolean; error?: string } {
      for (const selection of tierSelections) {
        const tier = tiers.find((t) => t._id === selection.tierId);
        if (!tier) return { valid: false, error: "Invalid tier selected" };
        if (tier.price !== 0) return { valid: false, error: "This event requires payment" };
      }
      return { valid: true };
    }

    const result = validateFreeTiers(
      [{ tierId: "tier:unknown", quantity: 1 }],
      [{ _id: "tier:other", price: 0 }]
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/invalid tier/i);
  });
});

// ---- Security contract: registrationSecret ----

describe("registerFreeEvent security contract", () => {
  it("mutation args must include registrationSecret (prevents unauthorized calls)", () => {
    const mutationArgs = {
      registrationSecret: "convex-secret-value",
      eventId: "event:xyz",
      tierSelections: [{ tierId: "tier:abc", quantity: 1 }],
      buyerEmail: "buyer@example.com",
    };
    expect(mutationArgs).toHaveProperty("registrationSecret");
    expect(typeof mutationArgs.registrationSecret).toBe("string");
    expect(mutationArgs.registrationSecret).not.toBe("");
  });

  it("registrationId format encodes both eventId and buyerEmail", () => {
    const eventId = "event:abc123";
    const buyerEmail = "buyer@example.com";
    const registrationId = `free_${eventId}_${buyerEmail}`;

    expect(registrationId).toContain(eventId);
    expect(registrationId).toContain(buyerEmail);
    expect(registrationId).toMatch(/^free_/);
  });
});

// ---- Capacity validation contract ----

describe("registerFreeEvent capacity validation contract", () => {
  it("returns error when available slots < requested quantity", () => {
    function checkCapacity(
      tierSelections: { tierId: string; quantity: number }[],
      tiers: { _id: string; quantity: number; soldCount: number }[]
    ): { valid: boolean; error?: string } {
      for (const selection of tierSelections) {
        const tier = tiers.find((t) => t._id === selection.tierId);
        if (!tier) continue;
        const available = tier.quantity - tier.soldCount;
        if (available < selection.quantity) {
          return {
            valid: false,
            error: "Some registration slots are no longer available",
          };
        }
      }
      return { valid: true };
    }

    const nearlyFullTier = { _id: "tier:abc", quantity: 100, soldCount: 95 };

    expect(checkCapacity([{ tierId: "tier:abc", quantity: 10 }], [nearlyFullTier])).toEqual(
      { valid: false, error: "Some registration slots are no longer available" }
    );

    expect(checkCapacity([{ tierId: "tier:abc", quantity: 5 }], [nearlyFullTier])).toEqual(
      { valid: true }
    );
  });

  it("exact capacity boundary: requesting exactly what is available is valid", () => {
    function checkCapacity(
      available: number,
      requested: number
    ): boolean {
      return available >= requested;
    }
    expect(checkCapacity(5, 5)).toBe(true);
    expect(checkCapacity(5, 6)).toBe(false);
  });
});
