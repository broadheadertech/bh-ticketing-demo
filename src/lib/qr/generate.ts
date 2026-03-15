import { signPayload, buildQrPayload, type QrPayload } from "./signing";

export type QrCodeResult = {
  /** JSON payload string — stored in DB and encoded in QR image */
  qrCode: string;
  /** HMAC-SHA256 hex signature — stored in DB for scanner verification */
  qrSignature: string;
};

/**
 * Generates the QR code value and HMAC signature for a ticket.
 *
 * qrCode   = JSON payload string (what gets encoded in the QR image)
 * qrSignature = HMAC-SHA256 signature of the payload
 *
 * QR images are rendered on-demand (Story 4.2) by passing qrCode to
 * QRCode.toDataURL() for emails or a React QR component for in-app display.
 */
export function generateQrCodeData(payload: QrPayload): QrCodeResult {
  const qrCode = buildQrPayload(payload);
  const qrSignature = signPayload(qrCode);
  return { qrCode, qrSignature };
}
