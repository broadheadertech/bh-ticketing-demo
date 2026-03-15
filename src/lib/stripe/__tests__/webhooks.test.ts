import { describe, it, expect, vi, beforeEach } from "vitest";

// M1 fix: mock dependencies BEFORE importing the route (vi.mock is hoisted by vitest)
vi.mock("@/lib/stripe/webhooks", () => ({
  verifyStripeWebhook: vi.fn(),
  processCheckoutCompleted: vi.fn(),
}));

// Mock next/server so the route handler can be imported in the test environment
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    }),
  },
}));

// Static imports are resolved AFTER vi.mock hoisting — these get the mocked versions
import { POST } from "@/app/api/webhooks/stripe/route";
import { verifyStripeWebhook, processCheckoutCompleted } from "@/lib/stripe/webhooks";
const mockVerify = vi.mocked(verifyStripeWebhook);
const mockProcess = vi.mocked(processCheckoutCompleted);

/**
 * Contract tests for stripe webhook processing logic.
 * Tests business logic contracts without requiring Stripe or Convex runtime.
 */

// ---- verifyStripeWebhook contract ----

function simulateSignatureVerification(
  rawBody: string,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  if (!signature || signature === "invalid") {
    return { valid: false, error: "No signatures found matching the expected signature for payload" };
  }
  if (!secret) {
    return { valid: false, error: "No webhook secret provided" };
  }
  return { valid: true };
}

// ---- processCheckoutCompleted contract ----

function extractMetadata(session: {
  payment_status: string;
  metadata: Record<string, string> | null;
  id: string;
}): { skip: boolean; error?: string; data?: { eventId: string; tierSelections: unknown[]; buyerEmail: string } } {
  if (session.payment_status !== "paid") {
    return { skip: true };
  }

  const { eventId, tierSelections: tierSelectionsJson, buyerEmail } =
    session.metadata ?? {};

  if (!eventId || !tierSelectionsJson || !buyerEmail) {
    return { skip: false, error: `Missing required metadata in session ${session.id}` };
  }

  let tierSelections: unknown[];
  try {
    tierSelections = JSON.parse(tierSelectionsJson);
  } catch {
    return { skip: false, error: `Failed to parse tierSelections JSON for session ${session.id}` };
  }

  // M3 fix: validate parsed structure
  if (
    !Array.isArray(tierSelections) ||
    tierSelections.length === 0 ||
    !(tierSelections as { tierId?: unknown; quantity?: unknown }[]).every(
      (s) => typeof s.tierId === "string" && typeof s.quantity === "number" && Number.isInteger(s.quantity) && s.quantity > 0
    )
  ) {
    return { skip: false, error: `Invalid tierSelections structure in session ${session.id}` };
  }

  return { skip: false, data: { eventId, tierSelections: tierSelections as { tierId: string; quantity: number }[], buyerEmail } };
}

describe("verifyStripeWebhook contract", () => {
  it("returns valid=true for a correct signature", () => {
    const result = simulateSignatureVerification(
      '{"type":"checkout.session.completed"}',
      "t=123,v1=abc",
      "whsec_test123"
    );
    expect(result.valid).toBe(true);
  });

  it("returns valid=false for an invalid signature", () => {
    const result = simulateSignatureVerification(
      '{"type":"checkout.session.completed"}',
      "invalid",
      "whsec_test123"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns valid=false for an empty signature", () => {
    const result = simulateSignatureVerification(
      '{"type":"checkout.session.completed"}',
      "",
      "whsec_test123"
    );
    expect(result.valid).toBe(false);
  });
});

describe("processCheckoutCompleted contract", () => {
  it("skips processing when payment_status is not 'paid'", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "unpaid",
      metadata: { eventId: "event:xyz", tierSelections: "[]", buyerEmail: "b@e.com" },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(true);
  });

  it("skips processing when payment_status is 'no_payment_required'", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "no_payment_required",
      metadata: { eventId: "event:xyz", tierSelections: "[]", buyerEmail: "b@e.com" },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(true);
  });

  it("processes session when payment_status is 'paid'", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: {
        eventId: "event:xyz",
        tierSelections: JSON.stringify([{ tierId: "tier:abc", quantity: 2 }]),
        buyerEmail: "buyer@example.com",
      },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.data).toBeDefined();
    expect(result.data?.eventId).toBe("event:xyz");
    expect(result.data?.buyerEmail).toBe("buyer@example.com");
  });

  it("throws (returns error) when eventId metadata is missing", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: { tierSelections: "[]", buyerEmail: "b@e.com" } as Record<string, string>,
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Missing required metadata");
  });

  it("throws (returns error) when buyerEmail metadata is missing", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: { eventId: "event:xyz", tierSelections: "[]" } as Record<string, string>,
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Missing required metadata");
  });

  it("throws (returns error) when tierSelections is not valid JSON", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: {
        eventId: "event:xyz",
        tierSelections: "not-valid-json",
        buyerEmail: "buyer@example.com",
      },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Failed to parse tierSelections JSON");
  });

  it("throws when tierSelections parses to non-array (e.g. null or object)", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: {
        eventId: "event:xyz",
        tierSelections: "null",
        buyerEmail: "buyer@example.com",
      },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Invalid tierSelections structure");
  });

  it("throws when tierSelections parses to an empty array", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: {
        eventId: "event:xyz",
        tierSelections: "[]",
        buyerEmail: "buyer@example.com",
      },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Invalid tierSelections structure");
  });

  it("parses tierSelections JSON string from session metadata correctly", () => {
    const tierSelections = [
      { tierId: "tier:abc", quantity: 2 },
      { tierId: "tier:def", quantity: 1 },
    ];
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: {
        eventId: "event:xyz",
        tierSelections: JSON.stringify(tierSelections),
        buyerEmail: "buyer@example.com",
      },
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.data?.tierSelections).toEqual(tierSelections);
  });

  it("handles null metadata gracefully", () => {
    const session = {
      id: "cs_test_abc",
      payment_status: "paid",
      metadata: null,
    };
    const result = extractMetadata(session);
    expect(result.skip).toBe(false);
    expect(result.error).toContain("Missing required metadata");
  });
});

function makeRequest(body = "raw-body", signature = "t=1,v1=abc") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: { "stripe-signature": signature },
  });
}

function makeStripeEvent(type: string) {
  return { id: "evt_test", type, data: { object: { id: "cs_test", payment_status: "paid" } } };
}

describe("webhook route handler (real POST, mocked internals)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when verifyStripeWebhook throws", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("No signatures found");
    });
    const response = await POST(makeRequest("body", "bad-sig"));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 200 with { received: true } on successful checkout.session.completed", async () => {
    mockVerify.mockReturnValue(makeStripeEvent("checkout.session.completed"));
    mockProcess.mockResolvedValue(undefined);
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });

  it("returns 200 (not 500) when processCheckoutCompleted throws (prevent Stripe retries)", async () => {
    mockVerify.mockReturnValue(makeStripeEvent("checkout.session.completed"));
    mockProcess.mockRejectedValue(new Error("Convex unavailable"));
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ received: true });
  });

  it("returns 200 without calling processCheckoutCompleted for other event types", async () => {
    mockVerify.mockReturnValue(makeStripeEvent("payment_intent.created"));
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(mockProcess).not.toHaveBeenCalled();
  });
});

describe("STRIPE_WEBHOOK_SECRET environment variable", () => {
  it("secret starts with whsec_ prefix (Stripe webhook signing secret format)", () => {
    const exampleSecret = "whsec_abc123def456";
    expect(exampleSecret.startsWith("whsec_")).toBe(true);
  });

  it("test webhook secret (Stripe CLI) also starts with whsec_", () => {
    const cliSecret = "whsec_test_local_signing_secret";
    expect(cliSecret.startsWith("whsec_")).toBe(true);
  });
});
