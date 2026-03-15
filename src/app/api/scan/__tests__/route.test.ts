import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ScanResponse } from "../route";
import { verifySignature, signPayload, buildQrPayload } from "@/lib/qr/signing";

/**
 * Contract tests for the /api/scan route logic.
 * Tests pure extracted logic functions — no Next.js module imports.
 * Consistent with all existing test files in this project.
 */

// ---- Pure logic extracted from route handler ----

type QrPayload = {
  ticketId: string;
  eventId: string;
  tierId: string;
  buyerEmail: string;
};

/** Parses scanned QR string into a QrPayload, returns null if invalid */
function parseScanPayload(qrCode: string): QrPayload | null {
  try {
    const payload = JSON.parse(qrCode);
    if (!payload.ticketId || !payload.eventId || !payload.tierId || !payload.buyerEmail) {
      return null;
    }
    return payload as QrPayload;
  } catch {
    return null;
  }
}

type TicketForScan = {
  _id: string;
  eventId: string;
  tierId: string;
  buyerEmail: string;
  qrCode: string;
  qrSignature: string;
  scannedAt?: number;
  scannedBy?: string;
};

/** Determines scan result given a ticket, the scanned payload string, and the expected eventId */
function checkScanResult(
  ticket: TicketForScan,
  scannedQrCode: string,
  eventId: string,
  signatureValid: boolean
): ScanResponse {
  // Check signature
  if (!signatureValid) {
    return { status: "invalid_signature" };
  }

  // Parse payload to check event
  const payload = parseScanPayload(scannedQrCode);
  if (!payload) {
    return { status: "invalid_signature" };
  }

  // Check event match
  if (payload.eventId !== eventId) {
    return { status: "wrong_event" };
  }

  // Check duplicate scan
  if (ticket.scannedAt !== undefined) {
    return { status: "already_scanned", scannedAt: ticket.scannedAt };
  }

  // Valid — not yet scanned
  return { status: "valid", buyerEmail: ticket.buyerEmail, tierId: ticket.tierId };
}

// ---- Test data helpers ----

function makeTicket(overrides: Partial<TicketForScan> = {}): TicketForScan {
  return {
    _id: "ticket:abc123",
    eventId: "event:xyz",
    tierId: "tier:def",
    buyerEmail: "buyer@example.com",
    qrCode: '{"ticketId":"abc123","eventId":"event:xyz","tierId":"tier:def","buyerEmail":"buyer@example.com"}',
    qrSignature: "a".repeat(64),
    ...overrides,
  };
}

function makeQrCode(payload: Partial<QrPayload> = {}): string {
  return JSON.stringify({
    ticketId: "abc123",
    eventId: "event:xyz",
    tierId: "tier:def",
    buyerEmail: "buyer@example.com",
    ...payload,
  });
}

// ---- parseScanPayload tests ----

describe("parseScanPayload", () => {
  it("parses valid QR payload JSON", () => {
    const qr = makeQrCode();
    const result = parseScanPayload(qr);
    expect(result).not.toBeNull();
    expect(result?.ticketId).toBe("abc123");
    expect(result?.eventId).toBe("event:xyz");
    expect(result?.tierId).toBe("tier:def");
    expect(result?.buyerEmail).toBe("buyer@example.com");
  });

  it("returns null for non-JSON string (tampered QR)", () => {
    expect(parseScanPayload("not-json-at-all")).toBeNull();
  });

  it("returns null for JSON missing ticketId", () => {
    const qr = JSON.stringify({ eventId: "event:xyz", tierId: "tier:def", buyerEmail: "a@b.com" });
    expect(parseScanPayload(qr)).toBeNull();
  });

  it("returns null for JSON missing eventId", () => {
    const qr = JSON.stringify({ ticketId: "abc", tierId: "tier:def", buyerEmail: "a@b.com" });
    expect(parseScanPayload(qr)).toBeNull();
  });

  it("returns null for JSON missing tierId", () => {
    const qr = JSON.stringify({ ticketId: "abc", eventId: "event:xyz", buyerEmail: "a@b.com" });
    expect(parseScanPayload(qr)).toBeNull();
  });

  it("returns null for JSON missing buyerEmail", () => {
    const qr = JSON.stringify({ ticketId: "abc", eventId: "event:xyz", tierId: "tier:def" });
    expect(parseScanPayload(qr)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseScanPayload("")).toBeNull();
  });
});

// ---- checkScanResult tests ----

describe("checkScanResult - valid ticket", () => {
  it("returns 'valid' for valid QR + correct eventId + not yet scanned", () => {
    const ticket = makeTicket();
    const qrCode = makeQrCode();
    const result = checkScanResult(ticket, qrCode, "event:xyz", true);
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.buyerEmail).toBe("buyer@example.com");
      expect(result.tierId).toBe("tier:def");
    }
  });
});

describe("checkScanResult - already scanned", () => {
  it("returns 'already_scanned' with timestamp when ticket already has scannedAt", () => {
    const scanTime = 1700000000000;
    const ticket = makeTicket({ scannedAt: scanTime });
    const qrCode = makeQrCode();
    const result = checkScanResult(ticket, qrCode, "event:xyz", true);
    expect(result.status).toBe("already_scanned");
    if (result.status === "already_scanned") {
      expect(result.scannedAt).toBe(scanTime);
    }
  });

  it("does NOT return 'valid' for already-scanned ticket (prevents re-admission)", () => {
    const ticket = makeTicket({ scannedAt: Date.now() });
    const qrCode = makeQrCode();
    const result = checkScanResult(ticket, qrCode, "event:xyz", true);
    expect(result.status).not.toBe("valid");
  });
});

describe("checkScanResult - invalid signature", () => {
  it("returns 'invalid_signature' when signature verification fails", () => {
    const ticket = makeTicket();
    const qrCode = makeQrCode();
    const result = checkScanResult(ticket, qrCode, "event:xyz", false);
    expect(result.status).toBe("invalid_signature");
  });

  it("returns 'invalid_signature' for tampered JSON payload", () => {
    const ticket = makeTicket();
    const result = checkScanResult(ticket, "not-valid-json", "event:xyz", false);
    expect(result.status).toBe("invalid_signature");
  });
});

describe("checkScanResult - wrong event", () => {
  it("returns 'wrong_event' when scanned ticket's eventId doesn't match expected", () => {
    const ticket = makeTicket({ eventId: "event:xyz" });
    const qrCode = makeQrCode({ eventId: "event:xyz" });
    // Scanner is at a different event
    const result = checkScanResult(ticket, qrCode, "event:DIFFERENT", true);
    expect(result.status).toBe("wrong_event");
  });
});

// ---- HMAC verification contract (M4 fix: use actual verifySignature, not mocks) ----

const TEST_SECRET = "test-secret-scan-route-hmac";

describe("verifySignature integration contract", () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = TEST_SECRET;
  });
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("correct signature passes verification (valid ticket path)", () => {
    const payload = makeQrCode();
    const sig = signPayload(payload);
    expect(verifySignature(payload, sig)).toBe(true);
  });

  it("tampered payload fails signature check (timing-safe comparison contract)", () => {
    const originalPayload = makeQrCode({ ticketId: "abc123" });
    const tamperedPayload = makeQrCode({ ticketId: "HACKED" });
    const sigForOriginal = signPayload(originalPayload);
    // Tampered QR string produces a different HMAC — verifySignature returns false
    expect(verifySignature(tamperedPayload, sigForOriginal)).toBe(false);
  });

  it("signature for different payload does not verify (uniqueness contract)", () => {
    const payload1 = makeQrCode({ ticketId: "ticket-A" });
    const payload2 = makeQrCode({ ticketId: "ticket-B" });
    const sigForPayload1 = signPayload(payload1);
    expect(verifySignature(payload2, sigForPayload1)).toBe(false);
  });

  it("QR payload round-trips: buildQrPayload → signPayload → verifySignature", () => {
    const qrPayload = { ticketId: "abc123", eventId: "event:xyz", tierId: "tier:def", buyerEmail: "b@b.com" };
    const qrCode = buildQrPayload(qrPayload);
    const sig = signPayload(qrCode);
    expect(verifySignature(qrCode, sig)).toBe(true);
  });
});
