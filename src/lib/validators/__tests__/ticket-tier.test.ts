import { describe, it, expect } from "vitest";
import {
  ticketTierSchema,
  createTicketTiersSchema,
} from "../ticket-tier";
import { MAX_TIERS_PER_EVENT } from "@/lib/utils/constants";

describe("ticketTierSchema", () => {
  const validTier = {
    name: "General Admission",
    price: 30000,
    quantity: 100,
  };

  it("accepts a valid tier", () => {
    const result = ticketTierSchema.safeParse(validTier);
    expect(result.success).toBe(true);
  });

  it("accepts a tier with description", () => {
    const result = ticketTierSchema.safeParse({
      ...validTier,
      description: "Standard entry ticket",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a free tier (price=0)", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, price: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts empty string description", () => {
    const result = ticketTierSchema.safeParse({
      ...validTier,
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = ticketTierSchema.safeParse({
      ...validTier,
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, price: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer price", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, price: 100.5 });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = ticketTierSchema.safeParse({ ...validTier, quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    const result = ticketTierSchema.safeParse({
      ...validTier,
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("createTicketTiersSchema", () => {
  const validTier = {
    name: "General Admission",
    price: 30000,
    quantity: 100,
  };

  it("accepts valid schema with one tier", () => {
    const result = createTicketTiersSchema.safeParse({
      eventId: "abc123",
      tiers: [validTier],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple tiers", () => {
    const result = createTicketTiersSchema.safeParse({
      eventId: "abc123",
      tiers: [validTier, { ...validTier, name: "VIP", price: 80000, quantity: 20 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty tiers array", () => {
    const result = createTicketTiersSchema.safeParse({
      eventId: "abc123",
      tiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many tiers", () => {
    const tiers = Array.from({ length: MAX_TIERS_PER_EVENT + 1 }, (_, i) => ({
      ...validTier,
      name: `Tier ${i + 1}`,
    }));
    const result = createTicketTiersSchema.safeParse({
      eventId: "abc123",
      tiers,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing eventId", () => {
    const result = createTicketTiersSchema.safeParse({
      eventId: "",
      tiers: [validTier],
    });
    expect(result.success).toBe(false);
  });
});
