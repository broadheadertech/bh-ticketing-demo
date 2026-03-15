"use server";

import { stripe } from "@/lib/stripe/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { purchaseSchema } from "@/lib/validators/ticket";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee

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

    // Fetch event server-side to get creator's Stripe account (never trust client)
    const event = await convex.query(api.events.getPublicEventById, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: input.eventId as any,
    });
    if (!event.creatorStripeAccountId) {
      return { success: false, error: "Creator has not connected a payment account" };
    }
    const creatorStripeAccountId = event.creatorStripeAccountId;

    // Fetch tiers server-side (never trust client prices)
    const tiers = await convex.query(api.ticketTiers.getPublicTiersByEventId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: input.eventId as any,
    });

    // Inventory check + build line items
    const lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [];
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
        price_data: {
          currency: "php",
          product_data: { name: tier.name },
          unit_amount: tier.price, // already in centavos
        },
        quantity: selection.quantity,
      });
    }

    // Apply promo code discount if provided
    let appliedPromoCode: string | undefined;
    if (input.promoCode) {
      const promo = await convex.query(api.promoCodes.validatePromoCode, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: input.eventId as any,
        code: input.promoCode,
      });
      if (!promo.valid) {
        return { success: false, error: promo.error };
      }
      appliedPromoCode = promo.code;

      // Apply discount to each line item
      for (const item of lineItems) {
        const originalPrice = item.price_data.unit_amount;
        if (promo.discountType === "percentage") {
          item.price_data.unit_amount = Math.round(
            originalPrice * (1 - promo.discountValue / 100)
          );
        } else {
          item.price_data.unit_amount = Math.max(
            0,
            originalPrice - promo.discountValue
          );
        }
      }

      // Recalculate total with discount
      totalAmount = lineItems.reduce(
        (sum, item) => sum + item.price_data.unit_amount * item.quantity,
        0
      );
    }

    // Create Stripe Checkout Session — Separate Charges and Transfers
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: Math.round(totalAmount * PLATFORM_FEE_PERCENT),
        transfer_data: {
          destination: creatorStripeAccountId,
        },
      },
      metadata: {
        eventId: input.eventId,
        tierSelections: JSON.stringify(input.tierSelections),
        buyerEmail: input.buyerEmail,
        ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
      },
      success_url: `${APP_URL}/events/${input.eventId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/events/${input.eventId}`,
    });

    return { success: true, data: { url: session.url! } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create checkout session",
    };
  }
}
