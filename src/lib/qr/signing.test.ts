import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  signPayload,
  verifySignature,
  buildQrPayload,
  type QrPayload,
} from "./signing";
import { generateQrCodeData } from "./generate";

const TEST_SECRET = "test-secret-for-qr-signing-unit-tests";

const samplePayload: QrPayload = {
  ticketId: "jx7abc123def456",
  eventId: "jh8xyz789ghi012",
  tierId: "jk9def345jkl678",
  buyerEmail: "buyer@example.com",
};

describe("signPayload contract", () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = TEST_SECRET;
  });
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("produces a 64-character hex string", () => {
    const sig = signPayload('{"ticketId":"abc"}');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same input produces same output", () => {
    const payload = buildQrPayload(samplePayload);
    const sig1 = signPayload(payload);
    const sig2 = signPayload(payload);
    expect(sig1).toBe(sig2);
  });

  it("different ticketIds produce different signatures (uniqueness per ticket)", () => {
    const p1 = buildQrPayload({ ...samplePayload, ticketId: "ticket-A" });
    const p2 = buildQrPayload({ ...samplePayload, ticketId: "ticket-B" });
    expect(signPayload(p1)).not.toBe(signPayload(p2));
  });

  it("throws when QR_SIGNING_SECRET is not set", () => {
    delete process.env.QR_SIGNING_SECRET;
    expect(() => signPayload('{"ticketId":"abc"}')).toThrow(
      "QR_SIGNING_SECRET env var is not set"
    );
  });
});

describe("verifySignature contract", () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = TEST_SECRET;
  });
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("returns true for a valid signature", () => {
    const payload = buildQrPayload(samplePayload);
    const sig = signPayload(payload);
    expect(verifySignature(payload, sig)).toBe(true);
  });

  it("returns false for a tampered payload (changed ticketId)", () => {
    const original = buildQrPayload(samplePayload);
    const sig = signPayload(original);
    const tampered = buildQrPayload({ ...samplePayload, ticketId: "HACKED" });
    expect(verifySignature(tampered, sig)).toBe(false);
  });

  it("returns false for a tampered payload (changed buyerEmail)", () => {
    const original = buildQrPayload(samplePayload);
    const sig = signPayload(original);
    const tampered = buildQrPayload({
      ...samplePayload,
      buyerEmail: "attacker@evil.com",
    });
    expect(verifySignature(tampered, sig)).toBe(false);
  });

  it("returns false for a wrong (random) signature", () => {
    const payload = buildQrPayload(samplePayload);
    const wrongSig = "a".repeat(64); // 64 chars but wrong content
    expect(verifySignature(payload, wrongSig)).toBe(false);
  });

  it("returns false for an empty signature", () => {
    const payload = buildQrPayload(samplePayload);
    expect(verifySignature(payload, "")).toBe(false);
  });

  it("returns false for a signature from a different ticketId", () => {
    const otherPayload = buildQrPayload({
      ...samplePayload,
      ticketId: "different-ticket",
    });
    const sigForOther = signPayload(otherPayload);
    const thisPayload = buildQrPayload(samplePayload);
    expect(verifySignature(thisPayload, sigForOther)).toBe(false);
  });
});

describe("verifySignature — missing secret contract", () => {
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("throws when QR_SIGNING_SECRET is not set (M1 fix: propagates config error loudly)", () => {
    delete process.env.QR_SIGNING_SECRET;
    const payload = buildQrPayload(samplePayload);
    expect(() => verifySignature(payload, "a".repeat(64))).toThrow(
      "QR_SIGNING_SECRET env var is not set"
    );
  });
});

describe("buildQrPayload contract", () => {
  it("produces valid JSON string", () => {
    const json = buildQrPayload(samplePayload);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("contains all four required fields", () => {
    const json = buildQrPayload(samplePayload);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("ticketId", samplePayload.ticketId);
    expect(parsed).toHaveProperty("eventId", samplePayload.eventId);
    expect(parsed).toHaveProperty("tierId", samplePayload.tierId);
    expect(parsed).toHaveProperty("buyerEmail", samplePayload.buyerEmail);
  });

  it("is deterministic — same input produces same JSON string", () => {
    const json1 = buildQrPayload(samplePayload);
    const json2 = buildQrPayload(samplePayload);
    expect(json1).toBe(json2);
  });

  it("different ticketIds produce different JSON strings", () => {
    const j1 = buildQrPayload({ ...samplePayload, ticketId: "a" });
    const j2 = buildQrPayload({ ...samplePayload, ticketId: "b" });
    expect(j1).not.toBe(j2);
  });
});

describe("generateQrCodeData contract (H1 fix: coverage for generate.ts)", () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = TEST_SECRET;
  });
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("returns qrCode as valid JSON string and qrSignature as 64-char hex", () => {
    const result = generateQrCodeData(samplePayload);
    expect(() => JSON.parse(result.qrCode)).not.toThrow();
    expect(result.qrSignature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("qrCode contains all four required payload fields", () => {
    const result = generateQrCodeData(samplePayload);
    const parsed = JSON.parse(result.qrCode);
    expect(parsed.ticketId).toBe(samplePayload.ticketId);
    expect(parsed.eventId).toBe(samplePayload.eventId);
    expect(parsed.tierId).toBe(samplePayload.tierId);
    expect(parsed.buyerEmail).toBe(samplePayload.buyerEmail);
  });

  it("qrSignature verifies against qrCode — round-trip integrity", () => {
    const result = generateQrCodeData(samplePayload);
    expect(verifySignature(result.qrCode, result.qrSignature)).toBe(true);
  });

  it("tampered qrCode fails verification against original qrSignature", () => {
    const result = generateQrCodeData(samplePayload);
    const tampered = buildQrPayload({ ...samplePayload, ticketId: "HACKED" });
    expect(verifySignature(tampered, result.qrSignature)).toBe(false);
  });

  it("different tickets produce different qrCode and qrSignature", () => {
    const r1 = generateQrCodeData(samplePayload);
    const r2 = generateQrCodeData({ ...samplePayload, ticketId: "other-ticket" });
    expect(r1.qrCode).not.toBe(r2.qrCode);
    expect(r1.qrSignature).not.toBe(r2.qrSignature);
  });

  it("is deterministic — same payload always produces same result", () => {
    const r1 = generateQrCodeData(samplePayload);
    const r2 = generateQrCodeData(samplePayload);
    expect(r1.qrCode).toBe(r2.qrCode);
    expect(r1.qrSignature).toBe(r2.qrSignature);
  });
});
