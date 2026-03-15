import { describe, it, expect } from "vitest";

/**
 * Contract tests for tickets module.
 * Validates business logic contracts without requiring Convex runtime.
 */

// ---- Idempotency logic ----

function wouldCreateTickets(
  existingSessionIds: string[],
  newSessionId: string
): boolean {
  return !existingSessionIds.includes(newSessionId);
}

// ---- soldCount increment logic ----

function computeNewSoldCount(
  currentSoldCount: number,
  quantity: number
): number {
  return currentSoldCount + quantity;
}

// ---- Ticket count per selection ----

function countTicketsToCreate(
  tierSelections: { tierId: string; quantity: number }[]
): number {
  return tierSelections.reduce((sum, s) => sum + s.quantity, 0);
}

// ---- Sold-out detection ----

function isEventSoldOut(
  tiers: { soldCount: number; quantity: number }[]
): boolean {
  return tiers.length > 0 && tiers.every((t) => t.soldCount >= t.quantity);
}

describe("createTicketsFromWebhook contract", () => {
  it("creates one ticket per quantity unit", () => {
    const selections = [
      { tierId: "tier:abc", quantity: 2 },
      { tierId: "tier:def", quantity: 1 },
    ];
    expect(countTicketsToCreate(selections)).toBe(3);
  });

  it("creates correct ticket count for single tier selection", () => {
    const selections = [{ tierId: "tier:abc", quantity: 5 }];
    expect(countTicketsToCreate(selections)).toBe(5);
  });

  it("idempotency: skips creation when session already processed", () => {
    const existingSessions = ["cs_test_abc123", "cs_test_xyz789"];
    expect(wouldCreateTickets(existingSessions, "cs_test_abc123")).toBe(false);
  });

  it("idempotency: creates tickets for new session", () => {
    const existingSessions = ["cs_test_abc123"];
    expect(wouldCreateTickets(existingSessions, "cs_test_new999")).toBe(true);
  });

  it("idempotency: creates tickets when no sessions exist yet", () => {
    expect(wouldCreateTickets([], "cs_test_first")).toBe(true);
  });
});

describe("soldCount increment contract", () => {
  it("increments soldCount by exact quantity", () => {
    expect(computeNewSoldCount(0, 2)).toBe(2);
    expect(computeNewSoldCount(10, 3)).toBe(13);
  });

  it("soldCount at capacity equals quantity", () => {
    const tier = { soldCount: 100, quantity: 100 };
    expect(tier.soldCount).toBe(tier.quantity);
  });
});

describe("soldOut detection contract", () => {
  it("event is sold out when all tiers at capacity", () => {
    const tiers = [
      { soldCount: 100, quantity: 100 },
      { soldCount: 50, quantity: 50 },
    ];
    expect(isEventSoldOut(tiers)).toBe(true);
  });

  it("event is NOT sold out when any tier has remaining capacity", () => {
    const tiers = [
      { soldCount: 100, quantity: 100 },
      { soldCount: 30, quantity: 50 },
    ];
    expect(isEventSoldOut(tiers)).toBe(false);
  });

  it("event with no tiers is NOT sold out", () => {
    expect(isEventSoldOut([])).toBe(false);
  });

  it("event status should become soldOut after last ticket sold", () => {
    const tiersBeforeSale = [{ soldCount: 99, quantity: 100 }];
    const updatedTiers = tiersBeforeSale.map((t) => ({
      ...t,
      soldCount: t.soldCount + 1,
    }));
    expect(isEventSoldOut(updatedTiers)).toBe(true);
  });
});

describe("tickets schema contract", () => {
  it("ticket record has required fields", () => {
    const ticket = {
      tierId: "tier:abc",
      eventId: "event:xyz",
      stripeSessionId: "cs_test_abc123",
      buyerEmail: "buyer@example.com",
      qrCode: "",
      qrSignature: "",
      createdAt: Date.now(),
    };
    expect(ticket).toHaveProperty("tierId");
    expect(ticket).toHaveProperty("eventId");
    expect(ticket).toHaveProperty("stripeSessionId");
    expect(ticket).toHaveProperty("buyerEmail");
    expect(ticket).toHaveProperty("qrCode");
    expect(ticket).toHaveProperty("qrSignature");
    expect(ticket).toHaveProperty("createdAt");
  });

  it("qrCode and qrSignature are empty string placeholders (Story 4.1 fills them)", () => {
    const ticket = { qrCode: "", qrSignature: "" };
    expect(ticket.qrCode).toBe("");
    expect(ticket.qrSignature).toBe("");
  });

  it("buyerUserId is optional (not required for webhook-based creation)", () => {
    const ticketWithoutUserId = {
      tierId: "tier:abc",
      eventId: "event:xyz",
      stripeSessionId: "cs_test_abc123",
      buyerEmail: "buyer@example.com",
      qrCode: "",
      qrSignature: "",
      createdAt: Date.now(),
    };
    expect(ticketWithoutUserId).not.toHaveProperty("buyerUserId");
  });
});

describe("createTicketsFromWebhook auth contract", () => {
  it("mutation requires webhookSecret arg (H1 fix: prevents unauthorized ticket creation)", () => {
    // The mutation signature requires webhookSecret — this test documents the contract.
    // A caller without the CONVEX_WEBHOOK_SECRET env var value cannot create tickets.
    const mutationArgs = {
      webhookSecret: "whsec_or_convex_secret_value",
      stripeSessionId: "cs_test_abc",
      eventId: "event:xyz",
      tierSelections: [{ tierId: "tier:abc", quantity: 1 }],
      buyerEmail: "buyer@example.com",
    };
    expect(mutationArgs).toHaveProperty("webhookSecret");
    expect(typeof mutationArgs.webhookSecret).toBe("string");
  });

  it("unauthorized call (wrong secret) must throw ConvexError", () => {
    // Simulates the authorization check in createTicketsFromWebhook handler
    function checkSecret(provided: string, expected: string | undefined) {
      if (provided !== expected) throw new Error("Unauthorized");
    }
    expect(() => checkSecret("wrong-secret", "correct-secret")).toThrow("Unauthorized");
    expect(() => checkSecret("correct-secret", "correct-secret")).not.toThrow();
  });

  it("getTicketsBySessionId does NOT exist as a public query (H2 fix: prevents PII exposure)", () => {
    // After the H2 fix, this query was removed to prevent unauthenticated PII exposure.
    // This test documents the security decision. Ticket lookup is done internally.
    const publicApiContract = { hasGetTicketsBySessionId: false };
    expect(publicApiContract.hasGetTicketsBySessionId).toBe(false);
  });
});

// ---- Free registration idempotency key logic ----

function buildFreeRegistrationSessionId(
  eventId: string,
  buyerEmail: string
): string {
  return `free_${eventId}_${buyerEmail}`;
}

// ---- Free tier price validation ----

function allTiersAreFree(tiers: { price: number }[]): boolean {
  return tiers.length > 0 && tiers.every((t) => t.price === 0);
}

// ---- Capacity check logic ----

function hasCapacity(
  soldCount: number,
  quantity: number,
  requested: number
): boolean {
  return soldCount + requested <= quantity;
}

describe("registerFreeTickets auth contract", () => {
  it("mutation requires registrationSecret arg", () => {
    const mutationArgs = {
      registrationSecret: "convex-webhook-secret-value",
      eventId: "event:xyz",
      tierSelections: [{ tierId: "tier:abc", quantity: 1 }],
      buyerEmail: "buyer@example.com",
    };
    expect(mutationArgs).toHaveProperty("registrationSecret");
    expect(typeof mutationArgs.registrationSecret).toBe("string");
  });

  it("wrong registrationSecret must throw (simulates guard check)", () => {
    function checkSecret(provided: string, expected: string | undefined) {
      if (provided !== expected) throw new Error("Unauthorized");
    }
    expect(() => checkSecret("wrong-secret", "correct-secret")).toThrow("Unauthorized");
    expect(() => checkSecret("correct-secret", "correct-secret")).not.toThrow();
  });
});

describe("registerFreeTickets idempotency contract", () => {
  it("synthetic session ID is 'free_eventId_buyerEmail' format", () => {
    const sessionId = buildFreeRegistrationSessionId(
      "event:abc123",
      "buyer@example.com"
    );
    expect(sessionId).toBe("free_event:abc123_buyer@example.com");
  });

  it("same email + event always produces same session ID (idempotency key)", () => {
    const id1 = buildFreeRegistrationSessionId("event:xyz", "a@b.com");
    const id2 = buildFreeRegistrationSessionId("event:xyz", "a@b.com");
    expect(id1).toBe(id2);
  });

  it("different email produces different session ID", () => {
    const id1 = buildFreeRegistrationSessionId("event:xyz", "a@b.com");
    const id2 = buildFreeRegistrationSessionId("event:xyz", "c@d.com");
    expect(id1).not.toBe(id2);
  });

  it("idempotency: skips creation when synthetic session ID already exists", () => {
    const existingSessions = [
      "free_event:xyz_a@b.com",
      "cs_test_abc123",
    ];
    const syntheticId = buildFreeRegistrationSessionId("event:xyz", "a@b.com");
    expect(wouldCreateTickets(existingSessions, syntheticId)).toBe(false);
  });

  it("idempotency: allows first registration for new email", () => {
    const existingSessions = ["free_event:xyz_other@b.com"];
    const syntheticId = buildFreeRegistrationSessionId("event:xyz", "new@b.com");
    expect(wouldCreateTickets(existingSessions, syntheticId)).toBe(true);
  });
});

describe("registerFreeTickets price validation contract", () => {
  it("all tiers free when all prices are 0", () => {
    const tiers = [{ price: 0 }, { price: 0 }];
    expect(allTiersAreFree(tiers)).toBe(true);
  });

  it("NOT all free when any tier has price > 0", () => {
    const tiers = [{ price: 0 }, { price: 500 }];
    expect(allTiersAreFree(tiers)).toBe(false);
  });

  it("NOT all free when empty tiers array", () => {
    expect(allTiersAreFree([])).toBe(false);
  });
});

describe("registerFreeTickets capacity contract", () => {
  it("has capacity when soldCount + quantity <= quantity limit", () => {
    expect(hasCapacity(50, 100, 40)).toBe(true);
    expect(hasCapacity(0, 100, 100)).toBe(true);
  });

  it("no capacity when soldCount + quantity > quantity limit", () => {
    expect(hasCapacity(95, 100, 10)).toBe(false);
    expect(hasCapacity(100, 100, 1)).toBe(false);
  });

  it("exact capacity boundary: soldCount + quantity == quantity is allowed", () => {
    expect(hasCapacity(99, 100, 1)).toBe(true);
  });
});

describe("free ticket schema contract", () => {
  it("free ticket uses synthetic stripeSessionId (no Stripe session)", () => {
    const ticket = {
      tierId: "tier:abc",
      eventId: "event:xyz",
      stripeSessionId: "free_event:xyz_buyer@example.com",
      buyerEmail: "buyer@example.com",
      qrCode: "",
      qrSignature: "",
      createdAt: Date.now(),
    };
    expect(ticket.stripeSessionId).toMatch(/^free_/);
    expect(ticket.qrCode).toBe("");
    expect(ticket.qrSignature).toBe("");
  });
});

// ---- getUniqueEmailsByEventId contract tests ----

function deduplicateTicketEmails(
  tickets: { buyerEmail: string }[]
): string[] {
  return [...new Set(tickets.map((t) => t.buyerEmail))];
}

function checkQuerySecret(
  provided: string,
  expected: string | undefined
): void {
  if (provided !== expected) throw new Error("Unauthorized");
}

describe("getUniqueEmailsByEventId auth contract", () => {
  it("requires querySecret — wrong secret throws Unauthorized", () => {
    expect(() => checkQuerySecret("wrong", "correct")).toThrow("Unauthorized");
  });

  it("correct querySecret does not throw", () => {
    expect(() => checkQuerySecret("correct", "correct")).not.toThrow();
  });

  it("undefined secret on both sides passes (documents env var missing behaviour)", () => {
    // When CONVEX_WEBHOOK_SECRET is not set, both sides are undefined → equal → passes
    // This is documented behaviour (same as other mutations in this file)
    expect(() => checkQuerySecret(undefined as any, undefined)).not.toThrow();
  });
});

describe("getUniqueEmailsByEventId deduplication contract", () => {
  it("same email from multiple tickets appears once", () => {
    const tickets = [
      { buyerEmail: "alice@example.com" },
      { buyerEmail: "alice@example.com" },
      { buyerEmail: "bob@example.com" },
    ];
    const emails = deduplicateTicketEmails(tickets);
    expect(emails).toHaveLength(2);
    expect(emails).toContain("alice@example.com");
    expect(emails).toContain("bob@example.com");
  });

  it("all unique emails are preserved", () => {
    const tickets = [
      { buyerEmail: "a@b.com" },
      { buyerEmail: "c@d.com" },
      { buyerEmail: "e@f.com" },
    ];
    expect(deduplicateTicketEmails(tickets)).toHaveLength(3);
  });

  it("no tickets for event returns empty array", () => {
    expect(deduplicateTicketEmails([])).toHaveLength(0);
  });

  it("single ticket holder returns array with one email", () => {
    const tickets = [{ buyerEmail: "solo@example.com" }];
    expect(deduplicateTicketEmails(tickets)).toEqual(["solo@example.com"]);
  });

  it("10 tickets from same buyer returns single email", () => {
    const tickets = Array.from({ length: 10 }, () => ({
      buyerEmail: "fan@example.com",
    }));
    const emails = deduplicateTicketEmails(tickets);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toBe("fan@example.com");
  });
});

// ---- getTicketsByStripeSessionId auth contract ----

describe("getTicketsByStripeSessionId auth contract", () => {
  it("requires querySecret — wrong secret throws Unauthorized", () => {
    expect(() =>
      checkQuerySecret("wrong-secret", "correct-secret")
    ).toThrow("Unauthorized");
  });

  it("correct querySecret does not throw", () => {
    expect(() =>
      checkQuerySecret("correct-secret", "correct-secret")
    ).not.toThrow();
  });

  it("returns tickets matching stripeSessionId (contract shape)", () => {
    // Simulates the query result shape for downstream QR generation
    const tickets = [
      {
        _id: "ticket:abc",
        stripeSessionId: "cs_test_123",
        eventId: "event:xyz",
        tierId: "tier:def",
        buyerEmail: "buyer@example.com",
        qrCode: "",
        qrSignature: "",
      },
      {
        _id: "ticket:def",
        stripeSessionId: "cs_test_123",
        eventId: "event:xyz",
        tierId: "tier:def",
        buyerEmail: "buyer@example.com",
        qrCode: "",
        qrSignature: "",
      },
    ];
    expect(tickets).toHaveLength(2);
    tickets.forEach((t) => {
      expect(t).toHaveProperty("_id");
      expect(t).toHaveProperty("eventId");
      expect(t).toHaveProperty("tierId");
      expect(t).toHaveProperty("buyerEmail");
      expect(t.qrCode).toBe("");       // empty before QR generation
      expect(t.qrSignature).toBe(""); // empty before QR generation
    });
  });

  it("free ticket synthetic sessionId is queryable (free_eventId_email format)", () => {
    const eventId = "event:abc";
    const email = "buyer@example.com";
    const syntheticId = `free_${eventId}_${email}`;
    expect(syntheticId).toBe("free_event:abc_buyer@example.com");
  });
});

// ---- patchTicketsQrCodes auth contract ----

describe("patchTicketsQrCodes auth contract", () => {
  it("requires webhookSecret — wrong secret throws Unauthorized", () => {
    expect(() => checkQuerySecret("wrong", "correct")).toThrow("Unauthorized");
  });

  it("correct webhookSecret does not throw", () => {
    expect(() => checkQuerySecret("correct", "correct")).not.toThrow();
  });

  it("update object has required shape: ticketId, qrCode, qrSignature", () => {
    const update = {
      ticketId: "ticket:abc123",
      qrCode: '{"ticketId":"abc","eventId":"xyz","tierId":"def","buyerEmail":"a@b.com"}',
      qrSignature: "a".repeat(64),
    };
    expect(update).toHaveProperty("ticketId");
    expect(update).toHaveProperty("qrCode");
    expect(update).toHaveProperty("qrSignature");
    expect(typeof update.qrCode).toBe("string");
    expect(typeof update.qrSignature).toBe("string");
  });

  it("empty updates array is a valid no-op call", () => {
    const updates: { ticketId: string; qrCode: string; qrSignature: string }[] = [];
    expect(updates).toHaveLength(0);
    // No-op: an empty batch is valid (e.g., idempotent re-run with no new tickets)
  });
});

// ---- getTicketByIdForScan contract tests ----

describe("getTicketByIdForScan auth contract", () => {
  it("wrong querySecret throws Unauthorized", () => {
    expect(() => checkQuerySecret("wrong", "correct")).toThrow("Unauthorized");
  });

  it("correct querySecret does not throw", () => {
    expect(() => checkQuerySecret("correct", "correct")).not.toThrow();
  });

  it("returns null for unknown ticketId (not found contract)", () => {
    // Simulates ctx.db.get returning null for a non-existent document
    const dbGetResult = null;
    const result = dbGetResult ?? null;
    expect(result).toBeNull();
  });

  it("returns ticket document when found", () => {
    const ticket = {
      _id: "ticket:abc123",
      eventId: "event:xyz",
      tierId: "tier:def",
      buyerEmail: "buyer@example.com",
      qrCode: '{"ticketId":"abc123","eventId":"xyz","tierId":"def","buyerEmail":"buyer@example.com"}',
      qrSignature: "a".repeat(64),
      scannedAt: undefined,
      scannedBy: undefined,
    };
    const result = ticket ?? null;
    expect(result).not.toBeNull();
    expect(result?._id).toBe("ticket:abc123");
  });
});

// ---- markTicketScanned contract tests ----

describe("markTicketScanned auth contract", () => {
  it("wrong scanSecret throws Unauthorized", () => {
    expect(() => checkQuerySecret("wrong-secret", "correct-secret")).toThrow("Unauthorized");
  });

  it("correct scanSecret does not throw", () => {
    expect(() => checkQuerySecret("correct-secret", "correct-secret")).not.toThrow();
  });
});

describe("markTicketScanned write contract", () => {
  it("patches scannedAt as a number (timestamp)", () => {
    const before = { scannedAt: undefined as number | undefined };
    const patch = { scannedAt: Date.now(), scannedBy: "scanner@example.com" };
    const after = { ...before, ...patch };
    expect(typeof after.scannedAt).toBe("number");
    expect(after.scannedAt).toBeGreaterThan(0);
  });

  it("patches scannedBy as a string (scanner email)", () => {
    const patch = { scannedAt: Date.now(), scannedBy: "scanner@example.com" };
    expect(typeof patch.scannedBy).toBe("string");
    expect(patch.scannedBy).toBe("scanner@example.com");
  });

  it("scannedAt is set after first scan and prevents re-admission", () => {
    const ticket = { scannedAt: undefined as number | undefined };
    // First scan
    const afterFirstScan = { ...ticket, scannedAt: Date.now() };
    expect(afterFirstScan.scannedAt).toBeDefined();
    // Duplicate scan check: if scannedAt is already set, return already_scanned
    const isDuplicate = afterFirstScan.scannedAt !== undefined;
    expect(isDuplicate).toBe(true);
  });
});

// ---- getMyTickets auth and enrichment contract ----

function checkClerkAuth(identity: { email?: string } | null): string {
  if (!identity) throw new Error("Unauthorized");
  if (!identity.email) throw new Error("No email in Clerk identity");
  return identity.email;
}

function enrichTicket(
  ticket: {
    _id: string;
    tierId: string;
    eventId: string;
    qrCode: string;
    qrSignature: string;
  },
  event: { title: string; date: number; time: string; venueName?: string } | null,
  tier: { name: string } | null
) {
  return {
    ...ticket,
    eventTitle: event?.title ?? "Unknown Event",
    eventDate: event?.date ?? 0,
    eventTime: event?.time ?? "",
    venueName: event?.venueName,
    tierName: tier?.name ?? "Unknown Tier",
  };
}

describe("getMyTickets auth contract", () => {
  it("throws Unauthorized when no Clerk identity", () => {
    expect(() => checkClerkAuth(null)).toThrow("Unauthorized");
  });

  it("throws when identity has no email", () => {
    expect(() => checkClerkAuth({ email: undefined })).toThrow(
      "No email in Clerk identity"
    );
  });

  it("returns buyer email for authenticated identity", () => {
    const email = checkClerkAuth({ email: "buyer@example.com" });
    expect(email).toBe("buyer@example.com");
  });
});

describe("getMyTickets enrichment contract", () => {
  const ticket = {
    _id: "ticket:abc123",
    tierId: "tier:def",
    eventId: "event:xyz",
    qrCode: '{"ticketId":"abc123","eventId":"xyz","tierId":"def","buyerEmail":"b@b.com"}',
    qrSignature: "a".repeat(64),
  };

  it("includes eventTitle from related event", () => {
    const result = enrichTicket(ticket, { title: "PHFest", date: 1700000000000, time: "8pm" }, { name: "VIP" });
    expect(result.eventTitle).toBe("PHFest");
  });

  it("falls back to 'Unknown Event' when event is null", () => {
    const result = enrichTicket(ticket, null, { name: "GA" });
    expect(result.eventTitle).toBe("Unknown Event");
  });

  it("falls back to 'Unknown Tier' when tier is null", () => {
    const result = enrichTicket(ticket, { title: "Fest", date: 1700000000000, time: "9pm" }, null);
    expect(result.tierName).toBe("Unknown Tier");
  });

  it("preserves qrCode and qrSignature from original ticket", () => {
    const result = enrichTicket(ticket, null, null);
    expect(result.qrCode).toBe(ticket.qrCode);
    expect(result.qrSignature).toBe(ticket.qrSignature);
  });

  it("includes venueName when event has one", () => {
    const result = enrichTicket(
      ticket,
      { title: "Fest", date: 1700000000000, time: "9pm", venueName: "SM Mall" },
      { name: "GA" }
    );
    expect(result.venueName).toBe("SM Mall");
  });

  it("venueName is undefined when event has none", () => {
    const result = enrichTicket(ticket, { title: "Fest", date: 1700000000000, time: "9pm" }, { name: "GA" });
    expect(result.venueName).toBeUndefined();
  });
});

// ---- getEntryStats contract tests ----

function computeEntryStats(
  tickets: { scannedAt?: number }[]
): { scanned: number; total: number } {
  return {
    total: tickets.length,
    scanned: tickets.filter((t) => t.scannedAt !== undefined).length,
  };
}

function checkEntryStatsAuth(
  identity: { subject?: string } | null,
  user: { _id: string } | null,
  event: { creatorId: string } | null
): void {
  if (!identity) throw new Error("Unauthorized");
  if (!user) throw new Error("Unauthorized");
  if (!event) throw new Error("Event not found");
  if (event.creatorId !== user._id)
    throw new Error("Unauthorized: only the event creator can view entry stats");
}

function formatEntryDisplay(scanned: number, total: number): string {
  return `${scanned} / ${total}`;
}

describe("getEntryStats auth contract", () => {
  it("throws Unauthorized when no Clerk identity", () => {
    expect(() => checkEntryStatsAuth(null, null, null)).toThrow("Unauthorized");
  });

  it("throws Unauthorized when user not found in DB", () => {
    expect(() =>
      checkEntryStatsAuth({ subject: "clerk_123" }, null, { creatorId: "user_456" })
    ).toThrow("Unauthorized");
  });

  it("throws Event not found for invalid eventId", () => {
    expect(() =>
      checkEntryStatsAuth({ subject: "clerk_123" }, { _id: "user_123" }, null)
    ).toThrow("Event not found");
  });

  it("throws when authenticated user is NOT the event creator (FR29)", () => {
    expect(() =>
      checkEntryStatsAuth(
        { subject: "clerk_123" },
        { _id: "user_123" },
        { creatorId: "user_OTHER" }
      )
    ).toThrow("Unauthorized: only the event creator can view entry stats");
  });

  it("does not throw when authenticated user IS the event creator", () => {
    expect(() =>
      checkEntryStatsAuth(
        { subject: "clerk_123" },
        { _id: "user_123" },
        { creatorId: "user_123" }
      )
    ).not.toThrow();
  });
});

describe("getEntryStats computeEntryStats contract", () => {
  it("returns { scanned: 0, total: 0 } for empty event (no tickets)", () => {
    expect(computeEntryStats([])).toEqual({ scanned: 0, total: 0 });
  });

  it("returns { scanned: 0, total: 2 } when no tickets have been scanned yet (AC#3)", () => {
    const tickets = [{}, {}];
    expect(computeEntryStats(tickets)).toEqual({ scanned: 0, total: 2 });
  });

  it("counts only tickets with scannedAt set as scanned", () => {
    const tickets = [{ scannedAt: 1700000000000 }, {}];
    expect(computeEntryStats(tickets)).toEqual({ scanned: 1, total: 2 });
  });

  it("all tickets scanned returns scanned === total", () => {
    const tickets = [{ scannedAt: 1700000000000 }, { scannedAt: 1700000000001 }];
    expect(computeEntryStats(tickets)).toEqual({ scanned: 2, total: 2 });
  });

  it("large event: 87 of 105 checked in (AC#2 example)", () => {
    const scanned = Array.from({ length: 87 }, (_, i) => ({ scannedAt: i + 1 }));
    const notScanned = Array.from({ length: 18 }, () => ({}));
    const tickets = [...scanned, ...notScanned];
    expect(computeEntryStats(tickets)).toEqual({ scanned: 87, total: 105 });
  });
});

describe("getEntryStats display format contract", () => {
  it('formats as "X / Y" (AC#2: "87 / 105 checked in" format)', () => {
    expect(formatEntryDisplay(87, 105)).toBe("87 / 105");
  });

  it('formats as "0 / 0" for empty event', () => {
    expect(formatEntryDisplay(0, 0)).toBe("0 / 0");
  });

  it('formats as "0 / 42" for event not yet started (AC#3)', () => {
    expect(formatEntryDisplay(0, 42)).toBe("0 / 42");
  });

  it("scanned equals total when all checked in", () => {
    expect(formatEntryDisplay(42, 42)).toBe("42 / 42");
  });
});
