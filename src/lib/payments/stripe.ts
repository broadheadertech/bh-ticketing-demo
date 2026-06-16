// Stripe provider — the international lane. Implements PaymentProvider so the
// checkout/webhook callers stay provider-agnostic. Mirrors the existing Connect
// flow (Separate Charges & Transfers: application fee + transfer to organizer).
//
// NOTE (Phase 3a): this adapter is built and ready but NOT yet the wired entry
// point — the live checkout still flows through src/lib/actions/stripe-checkout.ts.
// Phase 3b switches purchaseTickets to call getProvider().createCheckout().
import Stripe from "stripe";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  WebhookEvent,
} from "./types";

let _stripe: Stripe | null = null;
function client(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = await client().checkout.sessions.create({
      mode: "payment",
      line_items: input.lineItems.map((li) => ({
        price_data: {
          currency: "php",
          product_data: { name: li.name },
          unit_amount: li.amount, // centavos
        },
        quantity: li.quantity,
      })),
      // Connect: split to the organizer's account, platform keeps the fee.
      ...(input.destinationAccountRef && input.feeAmount != null
        ? {
            payment_intent_data: {
              application_fee_amount: input.feeAmount,
              transfer_data: { destination: input.destinationAccountRef },
            },
          }
        : {}),
      metadata: input.metadata,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { url: session.url!, ref: session.id };
  },

  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
    const signature = headers.get("stripe-signature") ?? "";
    let event: Stripe.Event;
    try {
      event = client().webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch {
      return null; // bad signature
    }
    if (event.type !== "checkout.session.completed") return null;
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return null;
    return {
      type: "paid",
      ref: session.id,
      metadata: session.metadata ?? {},
      amountCollected: session.amount_total ?? 0,
    };
  },

  async refund(paymentRef: string, amount?: number, reason?: string) {
    // paymentRef is the checkout session id → resolve its payment intent.
    const session = await client().checkout.sessions.retrieve(paymentRef);
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!pi) return { ok: false };
    await client().refunds.create({
      payment_intent: pi,
      ...(amount != null ? { amount } : {}), // omit → full refund of the charge
      ...(reason ? { reason: reason as Stripe.RefundCreateParams.Reason } : {}),
    });
    return { ok: true };
  },
};
