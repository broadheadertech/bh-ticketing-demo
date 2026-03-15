export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  verifyStripeWebhook,
  processCheckoutCompleted,
} from "@/lib/stripe/webhooks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    try {
      await processCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session
      );
    } catch (err) {
      console.error("Webhook processing error:", err);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
