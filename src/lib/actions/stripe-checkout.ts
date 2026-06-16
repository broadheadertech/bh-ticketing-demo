"use server";

import { api } from "../../../convex/_generated/api";
import { purchaseSchema } from "@/lib/validators/ticket";
import { getConvexHttpClient } from "@/lib/convex-http";
import {
  getProvider,
  resolveProviderId,
  DEFAULT_FEE_PERCENT,
} from "@/lib/payments";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function purchaseTickets(input: {
  eventId: string;
  tierSelections: { tierId: string; quantity: number }[];
  buyerEmail: string;
  promoCode?: string;
}): Promise<{
  success: boolean;
  data?: { url: string };
  error?: string;
}> {
  try {
    // Validate input shape
    const parsed = purchaseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Fetch event server-side (never trust client). Resolves the payment provider
    // from the event override → organizer default → platform default (PayMongo).
    const event = await getConvexHttpClient().query(api.events.getPublicEventById, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: input.eventId as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ev = event as any;
    const providerId = resolveProviderId(ev.paymentProvider, ev.creatorPaymentProvider);
    const feePercent = ev.creatorFeePercent ?? DEFAULT_FEE_PERCENT;

    // Stripe (international) requires the organizer's connected account for the split.
    if (providerId === "stripe" && !event.creatorStripeAccountId) {
      return { success: false, error: "Creator has not connected a payment account" };
    }

    // Fetch tiers server-side (never trust client prices)
    const tiers = await getConvexHttpClient().query(api.ticketTiers.getPublicTiersByEventId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: input.eventId as any,
    });

    // Inventory check + build provider-agnostic line items (amounts in centavos)
    const lineItems: { name: string; amount: number; quantity: number }[] = [];
    let totalAmount = 0;

    for (const selection of input.tierSelections) {
      const tier = tiers.find((t) => t._id === selection.tierId);
      if (!tier) return { success: false, error: "Invalid tier selected" };
      const available = tier.quantity - tier.soldCount;
      if (available < selection.quantity) {
        return { success: false, error: "Some tickets are no longer available" };
      }
      totalAmount += tier.price * selection.quantity;
      lineItems.push({
        name: tier.name,
        amount: tier.price, // already in centavos
        quantity: selection.quantity,
      });
    }

    // Apply promo code discount if provided
    let appliedPromoCode: string | undefined;
    if (input.promoCode) {
      const promo = await getConvexHttpClient().query(api.promoCodes.validatePromoCode, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: input.eventId as any,
        code: input.promoCode,
      });
      if (!promo.valid) {
        return { success: false, error: promo.error };
      }
      appliedPromoCode = promo.code;

      for (const item of lineItems) {
        if (promo.discountType === "percentage") {
          item.amount = Math.round(item.amount * (1 - promo.discountValue / 100));
        } else {
          item.amount = Math.max(0, item.amount - promo.discountValue);
        }
      }
      totalAmount = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
    }

    // Hand off to the resolved provider (PayMongo: platform-collect; Stripe: Connect).
    const provider = getProvider(providerId);
    const result = await provider.createCheckout({
      eventId: input.eventId,
      buyerEmail: input.buyerEmail,
      lineItems,
      metadata: {
        eventId: input.eventId,
        tierSelections: JSON.stringify(input.tierSelections),
        buyerEmail: input.buyerEmail,
        ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
      },
      successUrl:
        providerId === "stripe"
          ? `${APP_URL}/events/${input.eventId}/success?session_id={CHECKOUT_SESSION_ID}`
          : `${APP_URL}/events/${input.eventId}/success`,
      cancelUrl: `${APP_URL}/events/${input.eventId}`,
      feeAmount: Math.round((totalAmount * feePercent) / 100),
      destinationAccountRef: event.creatorStripeAccountId ?? null,
    });

    return { success: true, data: { url: result.url } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create checkout session",
    };
  }
}
