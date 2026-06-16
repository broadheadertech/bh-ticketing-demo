"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Creates a PayMongo Checkout Session for the mobile app (which can't call the
// Next.js server action). Validates prices/inventory + promo via public queries,
// then mints a hosted checkout URL. Tickets are issued by the PayMongo webhook
// (metadata carries eventId/tierSelections/buyerEmail). Amounts in centavos.
//
// Requires PAYMONGO_SECRET_KEY in the Convex deployment env
// (npx convex env set PAYMONGO_SECRET_KEY sk_test_...).
export const createCheckout = action({
  args: {
    eventId: v.string(),
    tierSelections: v.array(
      v.object({ tierId: v.string(), quantity: v.number() }),
    ),
    buyerEmail: v.string(),
    promoCode: v.optional(v.string()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ url: string } | { error: string }> => {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) return { error: "Payments are not configured yet." };

    const eventId = args.eventId as Id<"events">;

    // Re-price + inventory check against the server (never trust the client).
    const tiers = await ctx.runQuery(api.ticketTiers.getPublicTiersByEventId, {
      eventId,
    });
    const lineItems: { name: string; amount: number; quantity: number }[] = [];
    for (const sel of args.tierSelections) {
      const tier = tiers.find((t) => t._id === sel.tierId);
      if (!tier) return { error: "Invalid tier selected." };
      if (tier.quantity - tier.soldCount < sel.quantity) {
        return { error: "Some tickets are no longer available." };
      }
      lineItems.push({ name: tier.name, amount: tier.price, quantity: sel.quantity });
    }
    if (lineItems.length === 0) return { error: "No tickets selected." };

    // Promo (optional).
    let appliedCode: string | undefined;
    if (args.promoCode) {
      const promo = await ctx.runQuery(api.promoCodes.validatePromoCode, {
        eventId,
        code: args.promoCode,
      });
      if (!promo.valid) return { error: promo.error ?? "Invalid promo code." };
      appliedCode = promo.code;
      for (const item of lineItems) {
        if (promo.discountType === "percentage") {
          item.amount = Math.round(item.amount * (1 - promo.discountValue / 100));
        } else {
          item.amount = Math.max(0, item.amount - promo.discountValue);
        }
      }
    }

    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${key}:`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: lineItems.map((li) => ({
              name: li.name,
              amount: li.amount,
              currency: "PHP",
              quantity: li.quantity,
            })),
            payment_method_types: ["gcash", "paymaya", "grab_pay", "card"],
            success_url: args.successUrl,
            cancel_url: args.cancelUrl,
            description: `Tickets — event ${args.eventId}`,
            metadata: {
              eventId: args.eventId,
              tierSelections: JSON.stringify(args.tierSelections),
              buyerEmail: args.buyerEmail,
              ...(appliedCode ? { promoCode: appliedCode } : {}),
            },
            send_email_receipt: false,
          },
        },
      }),
    });
    if (!res.ok) {
      return { error: `Payment provider error (${res.status}).` };
    }
    const json = await res.json();
    const url = json?.data?.attributes?.checkout_url as string | undefined;
    if (!url) return { error: "Could not create checkout session." };
    return { url };
  },
});
