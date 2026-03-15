import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendPurchaseConfirmation } from "@/lib/actions/email";
import { generateQrCodeData } from "@/lib/qr/generate";

// Lazy singletons — initialized on first use, not at module load time.
// Route Handlers are evaluated by Next.js during build (for page data collection),
// so top-level initialization would fail without STRIPE_SECRET_KEY in the build env.
let _stripe: Stripe | null = null;
let _convex: ConvexHttpClient | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    _convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return _convex;
}

export function verifyStripeWebhook(
  rawBody: string,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export async function processCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const { eventId, tierSelections: tierSelectionsJson, buyerEmail, promoCode } =
    session.metadata ?? {};

  if (!eventId || !tierSelectionsJson || !buyerEmail) {
    throw new Error(
      `Missing required metadata in session ${session.id}`
    );
  }

  let tierSelections: { tierId: string; quantity: number }[];
  try {
    tierSelections = JSON.parse(tierSelectionsJson);
  } catch {
    throw new Error(
      `Failed to parse tierSelections JSON for session ${session.id}`
    );
  }

  // Validate parsed structure: must be a non-empty array of { tierId, quantity } objects
  if (
    !Array.isArray(tierSelections) ||
    tierSelections.length === 0 ||
    !tierSelections.every(
      (s) =>
        typeof s.tierId === "string" &&
        typeof s.quantity === "number" &&
        Number.isInteger(s.quantity) &&
        s.quantity > 0
    )
  ) {
    throw new Error(
      `Invalid tierSelections structure in session ${session.id}`
    );
  }

  await getConvex().mutation(api.tickets.createTicketsFromWebhook, {
    webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
    stripeSessionId: session.id,
    eventId,
    tierSelections,
    buyerEmail,
  });

  // Increment promo code usage if one was applied
  if (promoCode) {
    const totalQuantity = tierSelections.reduce((sum, s) => sum + s.quantity, 0);
    getConvex()
      .mutation(api.promoCodes.incrementPromoCodeUsage, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        code: promoCode,
        quantity: totalQuantity,
        webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
      })
      .catch((err) => console.error("Promo code usage increment failed:", err));
  }

  // Generate and store QR codes for the newly created tickets
  try {
    const tickets = await getConvex().query(
      api.tickets.getTicketsByStripeSessionId,
      {
        stripeSessionId: session.id,
        querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
      }
    );
    const qrUpdates = tickets.map((ticket) => ({
      ticketId: ticket._id,
      ...generateQrCodeData({
        ticketId: ticket._id,
        eventId: ticket.eventId,
        tierId: ticket.tierId,
        buyerEmail: ticket.buyerEmail,
      }),
    }));
    if (qrUpdates.length > 0) {
      await getConvex().mutation(api.tickets.patchTicketsQrCodes, {
        webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
        updates: qrUpdates,
      });
    }
  } catch (err) {
    // QR failure must NOT fail the webhook — tickets were already created successfully
    console.error("QR code generation failed:", err);
  }

  // Fire-and-forget — email failure must NOT cause webhook to fail
  sendPurchaseConfirmation({
    eventId,
    tierSelections,
    buyerEmail,
    totalAmountCentavos: session.amount_total ?? 0,
    stripeSessionId: session.id,
  }).catch((err) => console.error("Confirmation email failed:", err));
}
