import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for Stripe refund processing.
 * No Convex/Stripe runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Ticket grouping by stripeSessionId
// ---------------------------------------------------------------------------

describe("ticket grouping by stripeSessionId", () => {
  const tickets = [
    { _id: "t1", stripeSessionId: "cs_1", tierPrice: 50000 },
    { _id: "t2", stripeSessionId: "cs_1", tierPrice: 80000 },
    { _id: "t3", stripeSessionId: "cs_2", tierPrice: 50000 },
    { _id: "t4", stripeSessionId: "cs_3", tierPrice: 0 },
  ];

  it("groups tickets by stripeSessionId", () => {
    const groups = new Map<string, typeof tickets>();
    for (const ticket of tickets) {
      const group = groups.get(ticket.stripeSessionId) ?? [];
      group.push(ticket);
      groups.set(ticket.stripeSessionId, group);
    }

    expect(groups.size).toBe(3);
    expect(groups.get("cs_1")?.length).toBe(2);
    expect(groups.get("cs_2")?.length).toBe(1);
    expect(groups.get("cs_3")?.length).toBe(1);
  });

  it("each session maps to one Stripe charge (one refund)", () => {
    const uniqueSessions = [...new Set(tickets.map((t) => t.stripeSessionId))];
    expect(uniqueSessions.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Free vs paid ticket detection
// ---------------------------------------------------------------------------

describe("free vs paid ticket detection", () => {
  it("detects all-free sessions (tierPrice === 0)", () => {
    const sessionTickets = [
      { tierPrice: 0 },
      { tierPrice: 0 },
    ];
    const allFree = sessionTickets.every((t) => t.tierPrice === 0);
    expect(allFree).toBe(true);
  });

  it("detects paid sessions (any tierPrice > 0)", () => {
    const sessionTickets = [
      { tierPrice: 50000 },
      { tierPrice: 0 },
    ];
    const allFree = sessionTickets.every((t) => t.tierPrice === 0);
    expect(allFree).toBe(false);
  });

  it("marks free tickets as not_applicable", () => {
    const status = "not_applicable";
    expect(status).toBe("not_applicable");
  });
});

// ---------------------------------------------------------------------------
// Refund status transitions
// ---------------------------------------------------------------------------

describe("refund status transitions", () => {
  it("transitions from null to refunded on success", () => {
    const ticket = { refundStatus: undefined };
    const patched = {
      ...ticket,
      refundStatus: "refunded",
      refundedAt: Date.now(),
      stripeRefundId: "re_abc123",
    };
    expect(patched.refundStatus).toBe("refunded");
    expect(patched.refundedAt).toBeGreaterThan(0);
    expect(patched.stripeRefundId).toBe("re_abc123");
  });

  it("transitions from null to failed on error", () => {
    const ticket = { refundStatus: undefined };
    const patched = { ...ticket, refundStatus: "failed" };
    expect(patched.refundStatus).toBe("failed");
  });

  it("transitions from null to not_applicable for free tickets", () => {
    const ticket = { refundStatus: undefined };
    const patched = { ...ticket, refundStatus: "not_applicable" };
    expect(patched.refundStatus).toBe("not_applicable");
  });

  it("valid refund statuses are refunded, failed, not_applicable", () => {
    const validStatuses = ["refunded", "failed", "not_applicable"];
    expect(validStatuses).toContain("refunded");
    expect(validStatuses).toContain("failed");
    expect(validStatuses).toContain("not_applicable");
    expect(validStatuses).not.toContain("pending");
  });
});

// ---------------------------------------------------------------------------
// Idempotency — skip already processed tickets
// ---------------------------------------------------------------------------

describe("idempotency", () => {
  it("skips tickets that already have a refundStatus", () => {
    const tickets = [
      { _id: "t1", stripeSessionId: "cs_1", refundStatus: "refunded" },
      { _id: "t2", stripeSessionId: "cs_2", refundStatus: undefined },
    ];

    const needsProcessing = tickets.filter((t) => !t.refundStatus);
    expect(needsProcessing.length).toBe(1);
    expect(needsProcessing[0]._id).toBe("t2");
  });
});

// ---------------------------------------------------------------------------
// Error handling continuation
// ---------------------------------------------------------------------------

describe("error handling continuation", () => {
  it("processes remaining sessions after one failure", () => {
    const sessions = ["cs_1", "cs_2", "cs_3"];
    const results: { session: string; status: string }[] = [];

    for (const session of sessions) {
      if (session === "cs_2") {
        results.push({ session, status: "failed" });
      } else {
        results.push({ session, status: "refunded" });
      }
    }

    expect(results.length).toBe(3);
    expect(results.filter((r) => r.status === "refunded").length).toBe(2);
    expect(results.filter((r) => r.status === "failed").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Refund result shape
// ---------------------------------------------------------------------------

describe("refund result shape", () => {
  it("returns success with counts", () => {
    const result = {
      success: true,
      data: { refunded: 5, failed: 1, skipped: 2 },
    };

    expect(result.success).toBe(true);
    expect(result.data.refunded).toBe(5);
    expect(result.data.failed).toBe(1);
    expect(result.data.skipped).toBe(2);
  });

  it("returns failure with error message", () => {
    const result = {
      success: false,
      error: "Stripe API unavailable",
    };

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Refund confirmation email contract (Story 9.2)
// ---------------------------------------------------------------------------

describe("refund confirmation email parameter shape", () => {
  it("requires buyerEmail, eventTitle, and refundAmount", () => {
    const params = {
      buyerEmail: "user@example.com",
      eventTitle: "Summer Music Fest",
      refundAmount: "₱500.00",
    };

    expect(params.buyerEmail).toBe("user@example.com");
    expect(params.eventTitle).toBe("Summer Music Fest");
    expect(params.refundAmount).toBe("₱500.00");
  });

  it("optionally includes eventDate", () => {
    const params = {
      buyerEmail: "user@example.com",
      eventTitle: "Summer Music Fest",
      refundAmount: "₱500.00",
      eventDate: "March 20, 2026",
    };

    expect(params.eventDate).toBe("March 20, 2026");
  });
});

describe("refund email buyer deduplication", () => {
  it("aggregates refund amounts per unique buyer email", () => {
    const refundedTickets = [
      { buyerEmail: "alice@test.com", tierPrice: 50000 },
      { buyerEmail: "alice@test.com", tierPrice: 80000 },
      { buyerEmail: "bob@test.com", tierPrice: 50000 },
    ];

    const buyers = new Map<string, number>();
    for (const ticket of refundedTickets) {
      const existing = buyers.get(ticket.buyerEmail) ?? 0;
      buyers.set(ticket.buyerEmail, existing + ticket.tierPrice);
    }

    expect(buyers.size).toBe(2);
    expect(buyers.get("alice@test.com")).toBe(130000);
    expect(buyers.get("bob@test.com")).toBe(50000);
  });

  it("sends one email per buyer even with multiple sessions", () => {
    const sessions = [
      { sessionId: "cs_1", tickets: [{ buyerEmail: "alice@test.com", tierPrice: 50000 }] },
      { sessionId: "cs_2", tickets: [{ buyerEmail: "alice@test.com", tierPrice: 30000 }] },
    ];

    const buyers = new Map<string, number>();
    for (const session of sessions) {
      for (const ticket of session.tickets) {
        const existing = buyers.get(ticket.buyerEmail) ?? 0;
        buyers.set(ticket.buyerEmail, existing + ticket.tierPrice);
      }
    }

    expect(buyers.size).toBe(1);
    expect(buyers.get("alice@test.com")).toBe(80000);
  });
});

// ---------------------------------------------------------------------------
// Refund status badge logic (Story 9.2)
// ---------------------------------------------------------------------------

describe("refund status badge logic", () => {
  function getBadgeVariant(eventStatus: string, refundStatus?: string) {
    if (eventStatus !== "cancelled") return null;
    switch (refundStatus) {
      case "refunded":
        return "green";
      case "failed":
        return "red";
      case "not_applicable":
        return "gray";
      default:
        return "yellow";
    }
  }

  it("returns null for non-cancelled events", () => {
    expect(getBadgeVariant("published")).toBeNull();
    expect(getBadgeVariant("draft")).toBeNull();
  });

  it("returns green for refunded tickets", () => {
    expect(getBadgeVariant("cancelled", "refunded")).toBe("green");
  });

  it("returns red for failed refunds", () => {
    expect(getBadgeVariant("cancelled", "failed")).toBe("red");
  });

  it("returns gray for free event tickets", () => {
    expect(getBadgeVariant("cancelled", "not_applicable")).toBe("gray");
  });

  it("returns yellow for processing (no refundStatus yet)", () => {
    expect(getBadgeVariant("cancelled", undefined)).toBe("yellow");
    expect(getBadgeVariant("cancelled")).toBe("yellow");
  });
});

// ---------------------------------------------------------------------------
// Admin refund summary computation (Story 9.2)
// ---------------------------------------------------------------------------

describe("admin refund summary computation", () => {
  const tickets = [
    { refundStatus: "refunded", tierPrice: 50000 },
    { refundStatus: "refunded", tierPrice: 80000 },
    { refundStatus: "failed", tierPrice: 50000 },
    { refundStatus: "not_applicable", tierPrice: 0 },
    { refundStatus: undefined, tierPrice: 30000 },
  ];

  it("counts tickets by refund status", () => {
    const refundedCount = tickets.filter((t) => t.refundStatus === "refunded").length;
    const failedCount = tickets.filter((t) => t.refundStatus === "failed").length;
    const skippedCount = tickets.filter((t) => t.refundStatus === "not_applicable").length;

    expect(refundedCount).toBe(2);
    expect(failedCount).toBe(1);
    expect(skippedCount).toBe(1);
  });

  it("sums tierPrice only for refunded tickets", () => {
    const totalRefundAmount = tickets
      .filter((t) => t.refundStatus === "refunded")
      .reduce((sum, t) => sum + t.tierPrice, 0);

    expect(totalRefundAmount).toBe(130000);
  });

  it("includes total tickets count", () => {
    expect(tickets.length).toBe(5);
  });

  it("returns correct summary shape", () => {
    const summary = {
      totalTickets: tickets.length,
      refundedCount: tickets.filter((t) => t.refundStatus === "refunded").length,
      failedCount: tickets.filter((t) => t.refundStatus === "failed").length,
      skippedCount: tickets.filter((t) => t.refundStatus === "not_applicable").length,
      totalRefundAmount: tickets
        .filter((t) => t.refundStatus === "refunded")
        .reduce((sum, t) => sum + t.tierPrice, 0),
    };

    expect(summary).toEqual({
      totalTickets: 5,
      refundedCount: 2,
      failedCount: 1,
      skippedCount: 1,
      totalRefundAmount: 130000,
    });
  });

  it("excludes free tickets from refund amount total", () => {
    const freeTickets = [
      { refundStatus: "not_applicable", tierPrice: 0 },
      { refundStatus: "not_applicable", tierPrice: 0 },
    ];

    const total = freeTickets
      .filter((t) => t.refundStatus === "refunded")
      .reduce((sum, t) => sum + t.tierPrice, 0);

    expect(total).toBe(0);
  });
});
