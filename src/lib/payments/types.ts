// Payment provider abstraction.
//
// Both PayMongo (PH-primary) and Stripe (international) expose a HOSTED checkout
// that returns a URL, so callers (web redirect + mobile in-app browser) stay
// provider-agnostic. All provider-specific logic lives behind this interface.
// See PAYMENTS-ARCHITECTURE.md.

export type Provider = "paymongo" | "stripe";

/** Provider-independent checkout request. Amounts are in CENTAVOS. */
export type CheckoutInput = {
  eventId: string;
  buyerEmail: string;
  lineItems: { name: string; amount: number; quantity: number }[];
  /** Echoed back by the webhook so we can issue tickets. */
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  // Stripe Connect only (platform-collect PayMongo ignores these):
  feeAmount?: number; // centavos platform fee
  destinationAccountRef?: string | null; // organizer's connected account
};

export type CheckoutResult = {
  /** Hosted checkout URL to open (web redirect / mobile in-app browser). */
  url: string;
  /** Provider session/payment id — persisted as the ticket's paymentRef. */
  ref: string;
};

/** Normalized "payment succeeded" event parsed from a provider webhook. */
export type WebhookEvent = {
  type: "paid";
  ref: string;
  metadata: Record<string, string>;
  /** Gross amount actually collected, in centavos (for the payout ledger). */
  amountCollected: number;
};

export interface PaymentProvider {
  readonly id: Provider;
  /** Create a hosted checkout session and return its URL + reference. */
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Verify + parse a webhook. Returns null on bad signature or an ignored event. */
  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null;
  /** Refund a payment by its reference. Omit `amount` for a full refund. */
  refund(paymentRef: string, amount?: number, reason?: string): Promise<{ ok: boolean }>;
}
