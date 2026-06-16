// Provider-agnostic "a payment succeeded → issue tickets" pipeline.
// Used by the PayMongo webhook; mirrors the Stripe webhook's steps so both
// providers create tickets, QR codes, promo usage, payout ledger, and email
// through one path. Amounts in centavos.
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendPurchaseConfirmation } from "@/lib/actions/email";
import { generateQrCodeData } from "@/lib/qr/generate";
import type { Provider } from "./types";

let _convex: ConvexHttpClient | null = null;
function convex(): ConvexHttpClient {
  if (!_convex) _convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  return _convex;
}

export async function issuePaidOrder(opts: {
  provider: Provider;
  ref: string; // provider session/payment id
  metadata: Record<string, string>;
  amountCollected: number; // centavos
}): Promise<void> {
  const { provider, ref, metadata, amountCollected } = opts;
  const eventId = metadata.eventId;
  const buyerEmail = metadata.buyerEmail;
  const tierSelectionsJson = metadata.tierSelections;
  const promoCode = metadata.promoCode;

  if (!eventId || !buyerEmail || !tierSelectionsJson) {
    throw new Error(`Missing metadata in ${provider} order ${ref}`);
  }

  let tierSelections: { tierId: string; quantity: number }[];
  try {
    tierSelections = JSON.parse(tierSelectionsJson);
  } catch {
    throw new Error(`Bad tierSelections in ${provider} order ${ref}`);
  }
  if (
    !Array.isArray(tierSelections) ||
    tierSelections.length === 0 ||
    !tierSelections.every(
      (s) => typeof s.tierId === "string" && Number.isInteger(s.quantity) && s.quantity > 0,
    )
  ) {
    throw new Error(`Invalid tierSelections in ${provider} order ${ref}`);
  }

  const secret = process.env.CONVEX_WEBHOOK_SECRET!;

  // 1. Tickets (idempotent on paymentRef/session).
  await convex().mutation(api.tickets.createTicketsFromWebhook, {
    webhookSecret: secret,
    stripeSessionId: ref, // reused as the generic session key
    eventId,
    tierSelections,
    buyerEmail,
    provider,
    paymentRef: ref,
  });

  // 2. Promo usage (fire-and-forget).
  if (promoCode) {
    const totalQuantity = tierSelections.reduce((s, x) => s + x.quantity, 0);
    convex()
      .mutation(api.promoCodes.incrementPromoCodeUsage, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        code: promoCode,
        quantity: totalQuantity,
        webhookSecret: secret,
      })
      .catch((err) => console.error("Promo increment failed:", err));
  }

  // 3. Payout ledger (platform-collect).
  await convex()
    .mutation(api.payouts.recordPayout, {
      webhookSecret: secret,
      eventId,
      provider,
      paymentRef: ref,
      grossAmount: amountCollected,
    })
    .catch((err) => console.error("Payout ledger record failed:", err));

  // 4. QR codes for the new tickets.
  try {
    const tickets = await convex().query(api.tickets.getTicketsByStripeSessionId, {
      stripeSessionId: ref,
      querySecret: secret,
    });
    const updates = tickets.map((t) => ({
      ticketId: t._id,
      ...generateQrCodeData({
        ticketId: t._id,
        eventId: t.eventId,
        tierId: t.tierId,
        buyerEmail: t.buyerEmail,
      }),
    }));
    if (updates.length > 0) {
      await convex().mutation(api.tickets.patchTicketsQrCodes, {
        webhookSecret: secret,
        updates,
      });
    }
  } catch (err) {
    console.error("QR generation failed:", err);
  }

  // 5. Confirmation email (fire-and-forget).
  sendPurchaseConfirmation({
    eventId,
    tierSelections,
    buyerEmail,
    totalAmountCentavos: amountCollected,
    stripeSessionId: ref,
  }).catch((err) => console.error("Confirmation email failed:", err));
}
