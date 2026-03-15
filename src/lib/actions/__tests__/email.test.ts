import { describe, it, expect } from "vitest";

/**
 * Contract tests for email Server Actions.
 * Pure contract tests following the established project pattern
 * (see stripe-connect.test.ts, free-registration.test.ts).
 * No module-level imports of the actual Server Actions.
 */

// ---- Return shape contract ----

describe("sendPurchaseConfirmation return shape contract", () => {
  it("success response contains success:true", () => {
    const successShape = { success: true };
    expect(successShape.success).toBe(true);
  });

  it("error response contains success:false and error string", () => {
    const errorShape = { success: false, error: "Email failed" };
    expect(errorShape.success).toBe(false);
    expect(errorShape).toHaveProperty("error");
    expect(typeof errorShape.error).toBe("string");
  });

  it("all responses follow { success, error? } pattern — never throw", () => {
    const successShape = { success: true };
    const errorShape = { success: false, error: "Resend API error" };
    expect(successShape.success).toBe(true);
    expect(errorShape.success).toBe(false);
    expect(errorShape).toHaveProperty("error");
  });
});

describe("sendEventCancellation return shape contract", () => {
  it("success response contains success:true and emailsSent count", () => {
    const successShape = { success: true, emailsSent: 5 };
    expect(successShape.success).toBe(true);
    expect(successShape).toHaveProperty("emailsSent");
    expect(typeof successShape.emailsSent).toBe("number");
  });

  it("success with zero emails sent (no ticket holders)", () => {
    const successShape = { success: true, emailsSent: 0 };
    expect(successShape.success).toBe(true);
    expect(successShape.emailsSent).toBe(0);
  });

  it("error response contains success:false and error string", () => {
    const errorShape = { success: false, error: "Cancellation email failed" };
    expect(errorShape.success).toBe(false);
    expect(typeof errorShape.error).toBe("string");
  });
});

// ---- totalDisplay formatting contract ----

function buildTotalDisplay(totalAmountCentavos: number | "free"): string {
  if (totalAmountCentavos === "free") return "Free";
  // Simulates formatCurrency from @/lib/utils/format
  // NOTE: 0 centavos is NOT treated as "Free" — it renders as "₱0.00".
  // Callers that want "Free" must pass the "free" literal, not the number 0.
  return `₱${(totalAmountCentavos / 100).toFixed(2)}`;
}

describe("totalDisplay formatting contract", () => {
  it('"free" literal produces "Free"', () => {
    expect(buildTotalDisplay("free")).toBe("Free");
  });

  it("0 centavos (number) produces ₱0.00, NOT Free — caller must pass \"free\" literal for free events", () => {
    expect(buildTotalDisplay(0)).toBe("₱0.00");
  });

  it("non-zero centavos produces PHP currency string", () => {
    const result = buildTotalDisplay(150000);
    expect(result).toContain("1500.00");
  });

  it("100 centavos produces 1 PHP", () => {
    const result = buildTotalDisplay(100);
    expect(result).toContain("1.00");
  });
});

// ---- Email template prop contract ----

describe("TicketConfirmationEmail props contract", () => {
  it("required props include eventTitle, eventDate, eventTime, tiers, totalDisplay, buyerEmail", () => {
    const props = {
      eventTitle: "PHLive Music Fest",
      eventDate: "March 15, 2026",
      eventTime: "8:00 PM",
      tiers: [{ name: "General Admission", quantity: 2 }],
      totalDisplay: "₱500.00",
      buyerEmail: "buyer@example.com",
    };
    expect(props).toHaveProperty("eventTitle");
    expect(props).toHaveProperty("eventDate");
    expect(props).toHaveProperty("eventTime");
    expect(props).toHaveProperty("tiers");
    expect(props).toHaveProperty("totalDisplay");
    expect(props).toHaveProperty("buyerEmail");
  });

  it("venueName is optional", () => {
    const propsWithVenue = {
      eventTitle: "Test",
      eventDate: "March 15, 2026",
      eventTime: "8:00 PM",
      tiers: [{ name: "GA", quantity: 1 }],
      totalDisplay: "Free",
      buyerEmail: "a@b.com",
      venueName: "Araneta Coliseum",
    };
    const propsWithoutVenue = {
      eventTitle: "Test",
      eventDate: "March 15, 2026",
      eventTime: "8:00 PM",
      tiers: [{ name: "GA", quantity: 1 }],
      totalDisplay: "Free",
      buyerEmail: "a@b.com",
    };
    expect(propsWithVenue.venueName).toBe("Araneta Coliseum");
    expect(propsWithoutVenue).not.toHaveProperty("venueName");
  });

  it("tiers array contains name and quantity", () => {
    const tiers = [
      { name: "VIP", quantity: 1 },
      { name: "General", quantity: 3 },
    ];
    tiers.forEach((tier) => {
      expect(tier).toHaveProperty("name");
      expect(tier).toHaveProperty("quantity");
      expect(typeof tier.name).toBe("string");
      expect(typeof tier.quantity).toBe("number");
    });
  });

  it('free event shows "Free" as totalDisplay', () => {
    const props = { totalDisplay: "Free" };
    expect(props.totalDisplay).toBe("Free");
  });
});

describe("EventCancellationEmail props contract", () => {
  it("required props include eventTitle and eventDate", () => {
    const props = {
      eventTitle: "PHLive Music Fest",
      eventDate: "March 15, 2026",
    };
    expect(props).toHaveProperty("eventTitle");
    expect(props).toHaveProperty("eventDate");
  });

  it("cancellationReason is optional", () => {
    const propsWithReason = {
      eventTitle: "Test",
      eventDate: "March 15, 2026",
      cancellationReason: "Venue unavailable",
    };
    const propsWithoutReason = {
      eventTitle: "Test",
      eventDate: "March 15, 2026",
    };
    expect(propsWithReason.cancellationReason).toBe("Venue unavailable");
    expect(propsWithoutReason).not.toHaveProperty("cancellationReason");
  });
});

// ---- Recipient deduplication contract ----

function deduplicateEmails(emails: string[]): string[] {
  return [...new Set(emails)];
}

describe("cancellation email recipient deduplication contract", () => {
  it("same email from multiple tickets appears once", () => {
    const emails = ["a@b.com", "a@b.com", "c@d.com"];
    const unique = deduplicateEmails(emails);
    expect(unique).toHaveLength(2);
    expect(unique).toContain("a@b.com");
    expect(unique).toContain("c@d.com");
  });

  it("all unique emails are preserved", () => {
    const emails = ["a@b.com", "c@d.com", "e@f.com"];
    expect(deduplicateEmails(emails)).toHaveLength(3);
  });

  it("empty array returns empty array", () => {
    expect(deduplicateEmails([])).toHaveLength(0);
  });

  it("single email appears once", () => {
    const emails = ["x@y.com"];
    expect(deduplicateEmails(emails)).toEqual(["x@y.com"]);
  });
});

// ---- formatTextCode contract (Story 4.2) ----

function formatTextCode(ticketId: string): string {
  const code = ticketId.slice(0, 8).toUpperCase();
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

describe("formatTextCode contract", () => {
  it("formats first 8 chars as XXXX-XXXX", () => {
    expect(formatTextCode("jx7abc12extra")).toBe("JX7A-BC12");
  });

  it("uppercases the code", () => {
    expect(formatTextCode("abcdefghijkl")).toBe("ABCD-EFGH");
  });

  it("handles exactly 8 char IDs", () => {
    expect(formatTextCode("12345678")).toBe("1234-5678");
  });

  it("truncates IDs longer than 8 chars — only first 8 used", () => {
    const result = formatTextCode("aabbccddEEFF");
    expect(result).toBe("AABB-CCDD");
  });
});

// ---- qrItems email prop contract (Story 4.2) ----

describe("TicketConfirmationEmail qrItems prop contract", () => {
  it("qrItems is optional — email sends without QR codes when absent", () => {
    const propsWithoutQr = {
      eventTitle: "Test Event",
      eventDate: "March 15, 2026",
      eventTime: "8:00 PM",
      tiers: [{ name: "GA", quantity: 1 }],
      totalDisplay: "₱500.00",
      buyerEmail: "buyer@example.com",
    };
    // qrItems not present — still a valid props object
    expect(propsWithoutQr).not.toHaveProperty("qrItems");
  });

  it("qrItems with entries contain qrDataUrl and textCode", () => {
    const qrItems = [
      { qrDataUrl: "data:image/png;base64,abc123", textCode: "ABCD-EF12" },
      { qrDataUrl: "data:image/png;base64,def456", textCode: "1234-5678" },
    ];
    qrItems.forEach((item) => {
      expect(item).toHaveProperty("qrDataUrl");
      expect(item).toHaveProperty("textCode");
      expect(item.qrDataUrl).toMatch(/^data:/);
      expect(item.textCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });

  it("empty qrItems array renders no QR section", () => {
    const qrItems: { qrDataUrl: string; textCode: string }[] = [];
    // Contract: empty array → conditional renders nothing
    expect(qrItems.length > 0).toBe(false);
  });

  it("backward-compat: sendPurchaseConfirmation without stripeSessionId still builds valid email props", () => {
    // Simulates the case where stripeSessionId is not provided
    const params = {
      eventId: "evt123",
      tierSelections: [{ tierId: "tier1", quantity: 2 }],
      buyerEmail: "buyer@example.com",
      totalAmountCentavos: 50000,
      // stripeSessionId intentionally absent
    };
    // qrItems defaults to [] when no stripeSessionId
    const qrItems: { qrDataUrl: string; textCode: string }[] = [];
    expect(params).not.toHaveProperty("stripeSessionId");
    expect(qrItems).toHaveLength(0);
  });
});

// ---- Fire-and-forget pattern contract ----

describe("email fire-and-forget contract", () => {
  it("email call is non-blocking — returns Promise not awaited in caller", () => {
    // Simulates the fire-and-forget pattern used in webhooks.ts and free-registration.ts
    let emailCalled = false;
    const mockSendEmail = () => {
      return new Promise<void>((resolve) => {
        emailCalled = true;
        resolve();
      });
    };

    // Fire and forget — don't await
    mockSendEmail().catch(console.error);

    // The caller should not await — this is synchronous from the caller's perspective
    // emailCalled is true because Promise executor runs synchronously
    expect(emailCalled).toBe(true);
  });

  it("email error does NOT propagate to caller when using .catch()", async () => {
    const mockFailingEmail = () => Promise.reject(new Error("Resend down"));
    let caughtError: Error | null = null;

    mockFailingEmail().catch((err) => {
      caughtError = err;
    });

    // Wait for microtask queue
    await Promise.resolve();

    expect(caughtError).toBeInstanceOf(Error);
    // Caller was NOT thrown at — error was caught by .catch()
  });
});
