import crypto from "crypto";

export type QrPayload = {
  ticketId: string;
  eventId: string;
  tierId: string;
  buyerEmail: string;
};

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) throw new Error("QR_SIGNING_SECRET env var is not set");
  return secret;
}

/** Returns HMAC-SHA256 hex digest of the given string using QR_SIGNING_SECRET */
export function signPayload(payloadJson: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payloadJson)
    .digest("hex");
}

/**
 * Verifies that signature matches HMAC-SHA256 of payloadJson.
 * Uses timing-safe comparison to prevent oracle attacks (NFR10).
 *
 * Throws if QR_SIGNING_SECRET is not set — misconfigured callers must fail loudly,
 * not silently reject all tickets as if they were invalid.
 */
export function verifySignature(
  payloadJson: string,
  signature: string
): boolean {
  // signPayload throws if QR_SIGNING_SECRET is not set — let it propagate.
  const expected = signPayload(payloadJson);
  try {
    // Compare byte-buffer lengths (not string lengths) as required by timingSafeEqual.
    // Buffer.from(non-hex, "hex") can produce a shorter buffer than the string implies,
    // causing timingSafeEqual to throw on length mismatch.
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/** Builds the JSON string stored in tickets.qrCode and encoded in the QR image */
export function buildQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}
